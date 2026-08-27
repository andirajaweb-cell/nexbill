CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`normal_balance` text NOT NULL,
	`is_system_account` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `agent_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`system_prompt` text,
	`model` text DEFAULT 'claude-sonnet-5' NOT NULL,
	`is_whatsapp_enabled` integer DEFAULT true NOT NULL,
	`is_instagram_enabled` integer DEFAULT true NOT NULL,
	`handoff_keywords` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `approval_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`type` text NOT NULL,
	`ref_type` text NOT NULL,
	`ref_id` text NOT NULL,
	`requested_by` text,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`review_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text,
	`staff_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_data` text,
	`after_data` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`rental_unit_id` text,
	`console_type` text,
	`customer_id` text,
	`customer_name` text,
	`phone` text,
	`scheduled_start` text NOT NULL,
	`scheduled_end` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dp_amount` real DEFAULT 0 NOT NULL,
	`dp_paid` integer DEFAULT false NOT NULL,
	`notes` text,
	`waitlist_position` integer,
	`rental_session_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rental_unit_id`) REFERENCES `rental_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'cash' NOT NULL,
	`account_id` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`cash_bank_account_id` text NOT NULL,
	`shift_id` text,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`journal_entry_id` text,
	`staff_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_bank_account_id`) REFERENCES `cash_bank_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`direction` text NOT NULL,
	`sender` text NOT NULL,
	`body` text NOT NULL,
	`meta` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`external_id` text NOT NULL,
	`customer_id` text,
	`ai_enabled` integer DEFAULT true NOT NULL,
	`last_message_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text,
	`name` text,
	`phone` text,
	`email` text,
	`instagram_handle` text,
	`wa_jid` text,
	`notes` text,
	`membership_tier_id` text,
	`total_spending` real DEFAULT 0 NOT NULL,
	`loyalty_points` integer DEFAULT 0 NOT NULL,
	`last_visit_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_unique` ON `customers` (`phone`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`protocol` text DEFAULT 'tasmota_mqtt' NOT NULL,
	`mqtt_topic` text,
	`http_on_url` text,
	`http_off_url` text,
	`http_status_url` text,
	`config` text,
	`last_known_state` text DEFAULT 'unknown' NOT NULL,
	`last_seen_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`cash_bank_account_id` text NOT NULL,
	`shift_id` text,
	`staff_user_id` text,
	`journal_entry_id` text,
	`expense_date` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_bank_account_id`) REFERENCES `cash_bank_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`reference` text,
	`description` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`status` text DEFAULT 'posted' NOT NULL,
	`staff_user_id` text,
	`voided_at` text,
	`void_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`description` text,
	`line_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`points` integer NOT NULL,
	`note` text,
	`ref_order_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `membership_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`min_spending` real DEFAULT 0 NOT NULL,
	`point_multiplier` real DEFAULT 1 NOT NULL,
	`discount_percent` real DEFAULT 0 NOT NULL,
	`benefits` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`description` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`unit_price` real NOT NULL,
	`line_total` real NOT NULL,
	`item_type` text DEFAULT 'product' NOT NULL,
	`kitchen_status` text DEFAULT 'served' NOT NULL,
	`cancel_reason` text,
	`voided_by` text,
	`voided_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voided_by`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`customer_id` text,
	`rental_session_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`service_charge` real DEFAULT 0 NOT NULL,
	`apply_tax` integer DEFAULT false NOT NULL,
	`apply_service_charge` integer DEFAULT false NOT NULL,
	`voucher_id` text,
	`promo_id` text,
	`staff_user_id` text,
	`shift_id` text,
	`split_group_id` text,
	`merged_from_order_ids` text,
	`source` text DEFAULT 'pos' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rental_session_id`) REFERENCES `rental_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`promo_id`) REFERENCES `promos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `outlets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`wifi_ssid` text,
	`wifi_password` text,
	`billing_rounding_minutes` integer DEFAULT 15 NOT NULL,
	`service_charge_percent` real DEFAULT 0 NOT NULL,
	`tax_percent` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`method` text NOT NULL,
	`cash_bank_account_id` text,
	`amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider_ref` text,
	`qr_string` text,
	`qr_image_url` text,
	`fee_amount` real DEFAULT 0,
	`raw_response` text,
	`paid_at` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pricing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`console_type` text DEFAULT 'any' NOT NULL,
	`days_of_week` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`rate_type` text NOT NULL,
	`rate_value` real NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`sku` text,
	`barcode` text,
	`warehouse_id` text,
	`price` real NOT NULL,
	`cost_price` real DEFAULT 0,
	`stock_qty` integer DEFAULT 0 NOT NULL,
	`low_stock_threshold` integer DEFAULT 5 NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `promos` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`console_type` text,
	`duration_minutes` integer,
	`package_price` real,
	`discount_percent` real,
	`discount_amount` real,
	`code` text,
	`valid_from` text,
	`valid_until` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promos_code_unique` ON `promos` (`code`);--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`purchase_order_id` text,
	`invoice_number` text,
	`invoice_date` text NOT NULL,
	`due_date` text,
	`amount` real NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`journal_entry_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`qty_ordered` integer NOT NULL,
	`qty_received` integer DEFAULT 0 NOT NULL,
	`unit_cost` real NOT NULL,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`supplier_id` text NOT NULL,
	`po_number` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`order_date` text NOT NULL,
	`expected_date` text,
	`notes` text,
	`total_amount` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`purchase_invoice_id` text NOT NULL,
	`amount` real NOT NULL,
	`method` text NOT NULL,
	`cash_bank_account_id` text NOT NULL,
	`paid_at` text NOT NULL,
	`journal_entry_id` text,
	`staff_user_id` text,
	FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_bank_account_id`) REFERENCES `cash_bank_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_returns` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`purchase_invoice_id` text,
	`supplier_id` text NOT NULL,
	`product_id` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_cost` real NOT NULL,
	`reason` text,
	`journal_entry_id` text,
	`return_date` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_invoice_id`) REFERENCES `purchase_invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`customer_id` text,
	`order_id` text,
	`amount` real NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'open' NOT NULL,
	`journal_entry_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`ingredient_product_id` text NOT NULL,
	`qty_per_yield` real NOT NULL,
	`unit` text DEFAULT 'pcs' NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingredient_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`yield_qty` integer DEFAULT 1 NOT NULL,
	`notes` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rental_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`rental_unit_id` text NOT NULL,
	`customer_id` text,
	`customer_name` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`planned_minutes` integer,
	`rate_per_hour` real NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`total_amount` real DEFAULT 0,
	`promo_id` text,
	`staff_user_id` text,
	`paused_at` text,
	`accumulated_pause_ms` integer DEFAULT 0 NOT NULL,
	`extended_minutes` integer DEFAULT 0 NOT NULL,
	`game_name` text,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`voucher_id` text,
	`booking_id` text,
	`shift_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rental_unit_id`) REFERENCES `rental_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`promo_id`) REFERENCES `promos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rental_units` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`console_type` text NOT NULL,
	`tv_type` text NOT NULL,
	`device_id` text,
	`hourly_rate` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`staff_user_id` text NOT NULL,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`opening_cash` real DEFAULT 0 NOT NULL,
	`expected_cash` real,
	`actual_cash` real,
	`variance` real,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `staff_users` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'cashier' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_users_email_unique` ON `staff_users` (`email`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`type` text NOT NULL,
	`qty` integer NOT NULL,
	`note` text,
	`ref_order_id` text,
	`staff_user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_opname_items` (
	`id` text PRIMARY KEY NOT NULL,
	`stock_opname_id` text NOT NULL,
	`product_id` text NOT NULL,
	`system_qty` integer NOT NULL,
	`actual_qty` integer NOT NULL,
	`difference_qty` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`stock_opname_id`) REFERENCES `stock_opnames`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_opnames` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`warehouse_id` text,
	`opname_date` text NOT NULL,
	`staff_user_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`payment_terms_days` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`code` text NOT NULL,
	`type` text NOT NULL,
	`value` real NOT NULL,
	`min_purchase` real DEFAULT 0 NOT NULL,
	`max_discount` real,
	`valid_from` text,
	`valid_until` text,
	`usage_limit` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vouchers_code_unique` ON `vouchers` (`code`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `wifi_vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`outlet_id` text NOT NULL,
	`code` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price` real NOT NULL,
	`is_used` integer DEFAULT false NOT NULL,
	`used_at` text,
	`order_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`outlet_id`) REFERENCES `outlets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wifi_vouchers_code_unique` ON `wifi_vouchers` (`code`);