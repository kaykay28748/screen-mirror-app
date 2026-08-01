// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "HexcastScreenShare",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "HexcastScreenShare",
            targets: ["HexcastScreenShare"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/stasel/WebRTC.git", exact: "150.0.0")
    ],
    targets: [
        .target(
            name: "HexcastScreenShare",
            path: "ios/Sources/HexcastScreenShare",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "WebRTC", package: "WebRTC")
            ]
        )
    ]
)
