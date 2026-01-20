import UIKit
import Social
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

    // Must match AppConstants.appGroupID in main app
    private let appGroupID = "group.com.tylerjb.recipetoreality"
    // Must match AppConstants.sharedURLKey in main app
    private let sharedURLKey = "SharedRecipeURL"

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        // Process shared content
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else {
            completeWithError()
            return
        }

        // Look for URL in attachments
        for attachment in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, error in
                    if let url = data as? URL {
                        self?.saveURL(url)
                    } else if let urlData = data as? Data, let url = URL(dataRepresentation: urlData, relativeTo: nil) {
                        self?.saveURL(url)
                    } else {
                        self?.completeWithError()
                    }
                }
                return
            }

            // Also handle plain text that might be a URL
            if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, error in
                    if let text = data as? String, let url = URL(string: text), url.scheme != nil {
                        self?.saveURL(url)
                    } else {
                        self?.completeWithError()
                    }
                }
                return
            }
        }

        completeWithError()
    }

    private func saveURL(_ url: URL) {
        // Save to shared UserDefaults (App Group)
        if let userDefaults = UserDefaults(suiteName: appGroupID) {
            var pendingURLs = userDefaults.stringArray(forKey: sharedURLKey) ?? []
            pendingURLs.append(url.absoluteString)
            userDefaults.set(pendingURLs, forKey: sharedURLKey)
        }

        // Show success and complete
        DispatchQueue.main.async { [weak self] in
            self?.showSuccessAndComplete()
        }
    }

    private func showSuccessAndComplete() {
        // Create success view
        let successView = UIView()
        successView.backgroundColor = .systemBackground
        successView.layer.cornerRadius = 16
        successView.translatesAutoresizingMaskIntoConstraints = false

        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.alignment = .center
        stackView.spacing = 12
        stackView.translatesAutoresizingMaskIntoConstraints = false

        let iconView = UIImageView()
        iconView.image = UIImage(systemName: "checkmark.circle.fill")
        iconView.tintColor = .systemOrange
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Recipe Saved!"
        titleLabel.font = .systemFont(ofSize: 18, weight: .semibold)
        titleLabel.textAlignment = .center

        let subtitleLabel = UILabel()
        subtitleLabel.text = "Open Recipe to Reality to view"
        subtitleLabel.font = .systemFont(ofSize: 14)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center

        stackView.addArrangedSubview(iconView)
        stackView.addArrangedSubview(titleLabel)
        stackView.addArrangedSubview(subtitleLabel)

        successView.addSubview(stackView)
        view.addSubview(successView)

        NSLayoutConstraint.activate([
            iconView.widthAnchor.constraint(equalToConstant: 50),
            iconView.heightAnchor.constraint(equalToConstant: 50),

            stackView.centerXAnchor.constraint(equalTo: successView.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: successView.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: successView.leadingAnchor, constant: 20),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: successView.trailingAnchor, constant: -20),

            successView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            successView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            successView.widthAnchor.constraint(equalToConstant: 280),
            successView.heightAnchor.constraint(equalToConstant: 180)
        ])

        // Add shadow
        successView.layer.shadowColor = UIColor.black.cgColor
        successView.layer.shadowOffset = CGSize(width: 0, height: 4)
        successView.layer.shadowRadius = 12
        successView.layer.shadowOpacity = 0.15

        // Animate in
        successView.alpha = 0
        successView.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)

        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5) {
            successView.alpha = 1
            successView.transform = .identity
        }

        // Auto dismiss after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func completeWithError() {
        DispatchQueue.main.async { [weak self] in
            let error = NSError(domain: "com.tylerjb.recipetoreality.shareextension", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Could not extract URL from shared content"
            ])
            self?.extensionContext?.cancelRequest(withError: error)
        }
    }
}
