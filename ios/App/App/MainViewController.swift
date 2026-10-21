import UIKit
import Capacitor

// Enables the standard iOS edge-swipe-back gesture on the app's WKWebView.
// The web app is a Next.js SPA (client-side history.pushState routing), so
// WKWebView's own back-forward list tracks it the same way Safari tracks
// page history — this just turns on the native gesture that already knows
// how to walk that list. No JS bridge or custom gesture code needed.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
