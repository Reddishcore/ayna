import Foundation
import Capacitor
import RevenueCat

@objc(AynaIAPPlugin)
public class AynaIAPPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AynaIAPPlugin"
    public let jsName = "AynaIAP"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private var configured = false

    // JS'den cagrilir: Purchases SDK'sini bu kullanicinin email'i ile eslestir
    @objc func configure(_ call: CAPPluginCall) {
        guard let email = call.getString("appUserId") else {
            call.reject("appUserId (email) gerekli")
            return
        }
        if !configured {
            Purchases.logLevel = .warn
            Purchases.configure(withAPIKey: "test_qVrAtBtneyHKaMlTVydIeKQPZdP", appUserID: email)
            configured = true
        } else {
            Purchases.shared.logIn(email) { _, _, _ in }
        }
        call.resolve()
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId gerekli")
            return
        }
        Purchases.shared.getProducts([productId]) { products in
            guard let product = products.first else {
                call.reject("Urun bulunamadi: \(productId)")
                return
            }
            Purchases.shared.purchase(product: product) { _, customerInfo, error, userCancelled in
                if userCancelled {
                    call.reject("cancelled")
                    return
                }
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }
                let active = customerInfo?.entitlements["premium"]?.isActive ?? false
                call.resolve(["active": active])
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Purchases.shared.restorePurchases { customerInfo, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let active = customerInfo?.entitlements["premium"]?.isActive ?? false
            call.resolve(["active": active])
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        Purchases.shared.getCustomerInfo { customerInfo, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let active = customerInfo?.entitlements["premium"]?.isActive ?? false
            call.resolve(["active": active])
        }
    }
}
