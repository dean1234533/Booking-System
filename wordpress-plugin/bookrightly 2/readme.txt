=== Bookrightly ===
Contributors: bookrightly
Tags: booking, appointments, queue, scheduling, barber
Requires at least: 5.8
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add live online booking and a live walk-in queue to your WordPress site with a simple shortcode.

== Description ==

Bookrightly gives UK service businesses — barbers, hairdressers, decorators, personal trainers, plumbers and more — their own online booking system, live walk-in queue, payments, and business dashboard.

This plugin embeds your live Bookrightly booking widget directly into any WordPress page or post, so appointments happen right on your own site instead of sending visitors somewhere else — plus a "View Live Queue" button for your walk-in queue, the same button already on your Bookrightly booking page.

= Features =

* Live, bookable appointment slots embedded directly on your page
* A "View Live Queue" button that opens your live queue (position tracking, push notifications, all of it) in a new tab
* Works with any theme — the widget renders inside an isolated Shadow DOM so it never clashes with your site's styles, and your styles never leak into it
* No account or login needed for your visitors
* A free Bookrightly account is required (bookrightly.co.uk)

= How it works =

1. Create a free Bookrightly account at bookrightly.co.uk and set up your business page
2. Copy your Business ID from your dashboard under Integrations
3. Paste it into this plugin's settings (Settings → Bookrightly)
4. Add `[bookrightly mode="booking"]` or `[bookrightly mode="queue"]` to any page or post

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/bookrightly`, or install it directly through the WordPress plugins screen
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Go to Settings → Bookrightly and enter your Business ID
4. Add the `[bookrightly]` shortcode to any page or post

== Frequently Asked Questions ==

= Do I need a Bookrightly account? =

Yes. This plugin embeds your existing Bookrightly booking page. Sign up free at bookrightly.co.uk — no card required.

= Does this work with any theme? =

Yes. The widget renders inside its own isolated Shadow DOM, so it won't be affected by your theme's styles and won't affect your theme either.

= Can I use both booking and the live queue on the same page? =

Yes — add both shortcodes: `[bookrightly mode="booking"]` and `[bookrightly mode="queue"]`.

= Does the live queue work for my business? =

The live queue is available to businesses whose Bookrightly account has the Queue tool enabled (currently barber accounts). If it isn't enabled for your account, the shortcode won't show anything.

== Screenshots ==

1. The booking widget embedded on a WordPress page.
2. The live queue widget embedded on a WordPress page.
3. Plugin settings screen.

== Changelog ==

= 1.0.0 =
* Initial release.
