import Capacitor
import CoreMedia
import ReplayKit
import WebRTC

@objc(HexcastScreenSharePlugin)
public class HexcastScreenSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HexcastScreenSharePlugin"
    public let jsName = "ScreenShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createOffer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRemoteDescription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addIceCandidate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cleanup", returnType: CAPPluginReturnPromise)
    ]

    private static var sslInitialized = false

    private let factory = RTCPeerConnectionFactory()
    private var capturer: RTCVideoCapturer?
    private var videoSource: RTCVideoSource?
    private var videoTrack: RTCVideoTrack?
    private var peerConnection: RTCPeerConnection?
    private var capturing = false

    // MARK: - Setup

    private func ensureFactory() {
        guard videoSource == nil else { return }
        if !HexcastScreenSharePlugin.sslInitialized {
            RTCInitializeSSL()
            HexcastScreenSharePlugin.sslInitialized = true
        }
        let source = factory.videoSource()
        let track = factory.videoTrack(with: source, trackId: "hexcast-screen")
        capturer = RTCVideoCapturer(delegate: source)
        videoSource = source
        videoTrack = track
    }

    // MARK: - Plugin methods

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve([
            "supported": RPScreenRecorder.shared().isAvailable
        ])
    }

    @objc func startCapture(_ call: CAPPluginCall) {
        ensureFactory()
        guard RPScreenRecorder.shared().isAvailable else {
            call.reject("Screen recording is not available on this device")
            return
        }
        guard !capturing else {
            call.resolve()
            return
        }

        RPScreenRecorder.shared().startCapture { [weak self] sampleBuffer, bufferType, _ in
            guard let self, bufferType == .video else { return }
            self.pushFrame(sampleBuffer)
        } completionHandler: { [weak self] error in
            guard let self else { return }
            if let error {
                self.capturing = false
                self.notifyListeners("capturestate", data: ["state": "error", "message": error.localizedDescription])
            } else {
                self.capturing = true
                self.notifyListeners("capturestate", data: ["state": "started"])
            }
        }

        call.resolve()
    }

    @objc func stopCapture(_ call: CAPPluginCall) {
        guard capturing else {
            call.resolve()
            return
        }
        RPScreenRecorder.shared().stopCapture { [weak self] _ in
            self?.capturing = false
            self?.notifyListeners("capturestate", data: ["state": "stopped"])
            call.resolve()
        }
    }

    @objc func createOffer(_ call: CAPPluginCall) {
        ensureFactory()
        guard let videoTrack else {
            call.reject("Screen capture is not initialised")
            return
        }

        if let existing = peerConnection {
            existing.close()
            peerConnection = nil
        }

        let config = RTCConfiguration()
        config.sdpSemantics = .unifiedPlan
        config.continualGatheringPolicy = .gatherContinually
        if let servers = call.options["iceServers"] as? [[String: Any]] {
            config.iceServers = servers.map { server in
                let urls: [String] = {
                    if let strings = server["urls"] as? [String] {
                        return strings
                    }
                    if let single = server["urls"] as? String {
                        return [single]
                    }
                    return []
                }()
                return RTCIceServer(
                    urlStrings: urls,
                    username: server["username"] as? String,
                    credential: server["credential"] as? String
                )
            }
        }

        let mediaConstraints = RTCMediaConstraints(
            mandatoryConstraints: nil,
            optionalConstraints: [
                "offerToReceiveAudio": "false",
                "offerToReceiveVideo": "false"
            ]
        )

        guard let peerConnection = factory.peerConnection(with: config, constraints: mediaConstraints, delegate: self) else {
            call.reject("Unable to create a peer connection")
            return
        }
        self.peerConnection = peerConnection
        peerConnection.add(videoTrack, streamIds: ["hexcast"])

        peerConnection.offer(for: mediaConstraints) { [weak self, weak call] sdp, error in
            guard let self, let call else { return }
            if let error {
                call.reject("Unable to create an offer: \(error.localizedDescription)")
                return
            }
            guard let sdp else {
                call.reject("Empty offer")
                return
            }
            peerConnection.setLocalDescription(sdp) { error in
                if let error {
                    call.reject("Unable to set local description: \(error.localizedDescription)")
                    return
                }
                self.applyVideoBitrate(peerConnection)
                call.resolve([
                    "offer": [
                        "type": "offer",
                        "sdp": sdp.sdp
                    ]
                ])
            }
        }
    }

    @objc func setRemoteDescription(_ call: CAPPluginCall) {
        guard let peerConnection else {
            call.reject("No active peer connection")
            return
        }
        guard let type = call.options["type"] as? String,
              let sdp = call.options["sdp"] as? String else {
            call.reject("Missing remote description")
            return
        }
        let remoteType: RTCSdpType = type == "answer" ? .answer : .offer
        peerConnection.setRemoteDescription(RTCSessionDescription(type: remoteType, sdp: sdp)) { error in
            if let error {
                call.reject("Unable to set remote description: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }

    @objc func addIceCandidate(_ call: CAPPluginCall) {
        guard let peerConnection else {
            call.reject("No active peer connection")
            return
        }
        guard let sdp = call.options["candidate"] as? String else {
            call.reject("Missing candidate")
            return
        }
        let mLineIndex = (call.options["sdpMLineIndex"] as? Int) ?? 0
        let mid = call.options["sdpMid"] as? String
        peerConnection.add(RTCIceCandidate(sdp: sdp, sdpMLineIndex: Int32(mLineIndex), sdpMid: mid)) { error in
            if let error {
                call.reject("Unable to add ICE candidate: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }

    @objc func cleanup(_ call: CAPPluginCall) {
        teardown()
        call.resolve()
    }

    // MARK: - Frame delivery

    private func pushFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let capturer, let videoSource else { return }
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let timestampNs = Int64(CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer)) * 1_000_000_000)
        let rtcBuffer = RTCCVPixelBuffer(pixelBuffer: pixelBuffer)
        let frame = RTCVideoFrame(buffer: rtcBuffer, rotation: ._0, timeStampNs: timestampNs)
        videoSource.capturer(capturer, didCapture: frame)
    }

    private func applyVideoBitrate(_ peerConnection: RTCPeerConnection) {
        for sender in peerConnection.senders {
            guard sender.track != nil else { continue }
            let parameters = sender.parameters
            parameters.encodings.forEach { encoding in
                encoding.maxBitrateBps = 4_000_000
                encoding.maxFramerate = 30
            }
            sender.parameters = parameters
        }
    }

    // MARK: - Teardown

    private func teardown() {
        if capturing {
            RPScreenRecorder.shared().stopCapture { _ in }
            capturing = false
        }
        peerConnection?.close()
        peerConnection = nil
        capturer = nil
        videoTrack = nil
        videoSource = nil
    }
}

// MARK: - RTCPeerConnectionDelegate

extension HexcastScreenSharePlugin: RTCPeerConnectionDelegate {
    public func peerConnection(_ peerConnection: RTCPeerConnection, didChangeIceConnectionState newState: RTCIceConnectionState) {
        let state: String
        switch newState {
        case .new: state = "new"
        case .checking: state = "checking"
        case .connected: state = "connected"
        case .completed: state = "completed"
        case .failed: state = "failed"
        case .disconnected: state = "disconnected"
        case .closed: state = "closed"
        case .count: state = "unknown"
        @unknown default: state = "unknown"
        }
        notifyListeners("connectionstate", data: ["state": state])
    }

    public func peerConnection(_ peerConnection: RTCPeerConnection, didGenerateIceCandidate candidate: RTCIceCandidate) {
        var payload: [String: Any] = [
            "candidate": candidate.sdp,
            "sdpMLineIndex": Int(candidate.sdpMLineIndex)
        ]
        if let mid = candidate.sdpMid {
            payload["sdpMid"] = mid
        }
        notifyListeners("icecandidate", data: ["candidate": payload])
    }

    public func peerConnection(_ peerConnection: RTCPeerConnection, didChangeSignalingState stateChanged: RTCSignalingState) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didAddStream stream: RTCMediaStream) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didRemoveStream stream: RTCMediaStream) {}
    public func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didChangeIceGatheringState newState: RTCIceGatheringState) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didRemoveIceCandidates candidates: [RTCIceCandidate]) {}
    public func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}
