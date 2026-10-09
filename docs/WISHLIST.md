# Wishlist sharing and alerts

Saved items remain private unless the owner explicitly creates a share link. The public share page exposes published catalog items only, without the owner's name, email, address or notification preferences. Anyone holding the link can view that list. The owner can revoke it; recreating it produces a new token and the old link stays invalid. Public results paginate and are not cached. Links must not be indexed by search engines.

Owners can opt into price-drop and restock notifications separately per saved item. Enabling an alert records the current effective offering price and stock. Sale prices and aggregate active-variant stock are considered. Restock alerts apply to goods. Hidden offerings and unapproved merchants do not send notifications. Price alerts compare the offering's effective price, not individual variant prices.

Notifications appear in the customer's account. They are not SMS, email or WhatsApp messages. Each detected change and its observed state are committed together, so repeated scans do not duplicate the notification. Changes occurring entirely between scans cannot be detected.

Deployment: run Celery worker and Beat to execute `apps.catalog.tasks.dispatch_wishlist_alerts` every five minutes. For local development without workers, reopening/refreshing the Wishlist checks that customer's changes, or run `python manage.py check_wishlist_alerts` to check all opted-in items. No third-party credentials are required for in-app notifications.

Verification: backend tests cover opt-in baselines, ownership, sale-price drops, restock with variants, repeat scans, opt-out, hidden offerings, public privacy and revocation. The browser test checks saved settings, anonymous share viewing, revocation, removal and mobile width.
