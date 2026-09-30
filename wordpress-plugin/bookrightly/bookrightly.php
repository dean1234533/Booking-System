<?php
/**
 * Plugin Name: Bookrightly
 * Description: Add live online booking and a live walk-in queue to your WordPress site with a simple shortcode. Powered by Bookrightly — booking, payments and a business dashboard for UK service professionals.
 * Version: 1.0.0
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Author: Bookrightly
 * Author URI: https://bookrightly.co.uk
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: bookrightly
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'BOOKRIGHTLY_VERSION', '1.0.0' );
define( 'BOOKRIGHTLY_WIDGET_SRC', 'https://bookrightly.co.uk/widget.js' );

// ── Settings page ──────────────────────────────────────────────────────

add_action( 'admin_menu', function () {
	add_options_page(
		'Bookrightly',
		'Bookrightly',
		'manage_options',
		'bookrightly',
		'bookrightly_settings_page'
	);
} );

add_action( 'admin_init', function () {
	register_setting( 'bookrightly', 'bookrightly_shop_id', [ 'sanitize_callback' => 'sanitize_text_field' ] );
} );

function bookrightly_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) return;
	$shop = get_option( 'bookrightly_shop_id' );
	?>
	<div class="wrap">
		<h1>Bookrightly</h1>
		<p>Find your Business ID in your Bookrightly dashboard under <strong>Integrations</strong> (<a href="https://bookrightly.co.uk" target="_blank" rel="noopener">bookrightly.co.uk</a>).</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'bookrightly' ); ?>
			<table class="form-table">
				<tr>
					<th scope="row"><label for="bookrightly_shop_id">Business ID</label></th>
					<td><input type="text" id="bookrightly_shop_id" name="bookrightly_shop_id" value="<?php echo esc_attr( $shop ); ?>" class="regular-text" /></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<?php if ( $shop ) : ?>
			<h2>Shortcodes</h2>
			<p>Add either of these to any page or post:</p>
			<p><code>[bookrightly mode="booking"]</code> — live booking</p>
			<p><code>[bookrightly mode="queue"]</code> — live walk-in queue</p>
			<p>Both can be used on the same page.</p>
		<?php else : ?>
			<p><em>Save your Business ID above to enable the shortcodes.</em></p>
		<?php endif; ?>
	</div>
	<?php
}

// ── Shortcode ──────────────────────────────────────────────────────────

add_shortcode( 'bookrightly', function ( $atts ) {
	$atts = shortcode_atts( [
		'mode' => 'booking',
		'shop' => get_option( 'bookrightly_shop_id' ),
	], $atts, 'bookrightly' );

	$shop = sanitize_text_field( $atts['shop'] );
	$mode = in_array( $atts['mode'], [ 'booking', 'queue' ], true ) ? $atts['mode'] : 'booking';

	if ( empty( $shop ) ) {
		return current_user_can( 'manage_options' )
			? '<p>Bookrightly: set your Business ID under Settings &rarr; Bookrightly, or pass <code>shop="your-id"</code> to the shortcode.</p>'
			: '';
	}

	// A handle per mode (not per shortcode call) so a page can use both the
	// booking and queue shortcodes together — each gets its own <script>
	// tag carrying its own data-mode, matching how widget.js reads
	// document.currentScript once per script execution. Using the same
	// mode shortcode twice on one page still only mounts once (WordPress
	// dedupes enqueues by handle) — one widget per mode per page is the
	// supported use.
	$handle = 'bookrightly-widget-' . $mode;
	if ( ! wp_script_is( $handle, 'enqueued' ) ) {
		wp_enqueue_script( $handle, BOOKRIGHTLY_WIDGET_SRC, [], BOOKRIGHTLY_VERSION, true );
		add_filter( 'script_loader_tag', function ( $tag, $tag_handle ) use ( $handle, $shop, $mode ) {
			if ( $tag_handle !== $handle ) return $tag;
			return str_replace(
				' src=',
				sprintf( ' data-shop="%s" data-mode="%s" async src=', esc_attr( $shop ), esc_attr( $mode ) ),
				$tag
			);
		}, 10, 2 );
	}

	// The host div must already be in the DOM before widget.js's own
	// mount() runs — it looks for #bookrightly-widget-{mode} by id and
	// only creates one itself if missing. Since this shortcode's output is
	// printed inline in the page body and the script is enqueued in the
	// footer, the div is always present first.
	return sprintf( '<div id="bookrightly-widget-%s"></div>', esc_attr( $mode ) );
} );
