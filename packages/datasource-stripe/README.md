# @forestadmin/datasource-stripe

Forest Admin DataSource for Stripe - Connect your Stripe account to Forest Admin.

## Features

- **Full Stripe Integration**: Access all major Stripe resources as Forest Admin collections
- **Real-time Data**: Data is fetched directly from Stripe API
- **CRUD Operations**: Create, read, update, and delete operations where supported by Stripe
- **Type Mapping**: Automatic mapping of Stripe types to Forest Admin field types
- **Filtering**: Support for common filter operations on Stripe data
- **Resource Selection**: Include or exclude specific Stripe resources

## Supported Resources

| Resource | Collection Name | Create | Read | Update | Delete |
|----------|----------------|--------|------|--------|--------|
| Customers | Stripe Customers | ✅ | ✅ | ✅ | ✅ |
| Products | Stripe Products | ✅ | ✅ | ✅ | ✅ |
| Prices | Stripe Prices | ✅ | ✅ | ✅ | Archive |
| Subscriptions | Stripe Subscriptions | ✅ | ✅ | ✅ | Cancel |
| Invoices | Stripe Invoices | ✅ | ✅ | ✅ | Void/Delete |
| Payment Intents | Stripe Payment Intents | ✅ | ✅ | ✅ | Cancel |
| Charges | Stripe Charges | ❌ | ✅ | ⚠️ | ❌ |
| Refunds | Stripe Refunds | ✅ | ✅ | ✅ | Cancel |
| Balance Transactions | Stripe Balance Transactions | ❌ | ✅ | ❌ | ❌ |

> Note: Some resources have limited operations based on Stripe API constraints.

## Installation

```bash
npm install @forestadmin/datasource-stripe stripe
```

## Quick Start

### Basic Usage

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createStripeDataSource } = require('@forestadmin/datasource-stripe');

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
});

// Add Stripe datasource (reads STRIPE_SECRET_KEY from environment)
agent.addDataSource(createStripeDataSource());

agent.mountOnStandaloneServer(3000);
agent.start();
```

### With Configuration

```javascript
agent.addDataSource(createStripeDataSource({
  // Stripe Secret Key (optional if STRIPE_SECRET_KEY env var is set)
  secretKey: 'sk_test_xxxxx',

  // Stripe API version (optional)
  apiVersion: '2023-10-16',

  // Only include specific resources (optional)
  includeResources: ['customers', 'subscriptions', 'invoices'],

  // Exclude specific resources (optional)
  excludeResources: ['balance_transactions'],
}));
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secretKey` | `string` | `process.env.STRIPE_SECRET_KEY` | Stripe Secret API Key |
| `apiVersion` | `string` | `'2023-10-16'` | Stripe API version |
| `includeResources` | `string[]` | `null` (all) | Only include these resources |
| `excludeResources` | `string[]` | `[]` | Exclude these resources |

## Environment Variables

```bash
# Required: Stripe Secret Key
STRIPE_SECRET_KEY=sk_test_xxxxx

# Forest Admin configuration
FOREST_AUTH_SECRET=xxxxx
FOREST_ENV_SECRET=xxxxx
```

## Resource Details

### Customers

Manage your Stripe customers. Full CRUD support.

**Key Fields:**
- `id` - Customer ID
- `email` - Email address
- `name` - Customer name
- `phone` - Phone number
- `balance` - Account balance (read-only)
- `metadata` - Custom metadata

### Products

Manage your product catalog.

**Key Fields:**
- `id` - Product ID
- `name` - Product name
- `description` - Product description
- `active` - Whether product is active
- `default_price` - Default price ID
- `images` - Product images

### Prices

Manage pricing for your products.

**Key Fields:**
- `id` - Price ID
- `product` - Associated product ID
- `unit_amount` - Price in cents
- `currency` - Currency code
- `recurring` - Recurring pricing details
- `type` - `one_time` or `recurring`

### Subscriptions

Manage customer subscriptions.

**Key Fields:**
- `id` - Subscription ID
- `customer` - Customer ID
- `status` - Subscription status
- `current_period_start` - Current period start date
- `current_period_end` - Current period end date
- `items` - Subscription items

### Invoices

Manage invoices.

**Key Fields:**
- `id` - Invoice ID
- `customer` - Customer ID
- `status` - Invoice status
- `amount_due` - Amount due in cents
- `amount_paid` - Amount paid in cents
- `hosted_invoice_url` - Hosted invoice URL
- `invoice_pdf` - PDF download URL

### Payment Intents

Manage payment intents.

**Key Fields:**
- `id` - Payment Intent ID
- `amount` - Amount in cents
- `currency` - Currency code
- `status` - Payment status
- `customer` - Customer ID
- `payment_method` - Payment method ID

### Charges

View charge history (mostly read-only).

**Key Fields:**
- `id` - Charge ID
- `amount` - Amount in cents
- `status` - Charge status
- `paid` - Whether charge was paid
- `refunded` - Whether charge was refunded
- `receipt_url` - Receipt URL

### Refunds

Manage refunds.

**Key Fields:**
- `id` - Refund ID
- `amount` - Refund amount in cents
- `charge` - Original charge ID
- `status` - Refund status
- `reason` - Refund reason

### Balance Transactions

View balance transaction history (read-only).

**Key Fields:**
- `id` - Transaction ID
- `amount` - Amount in cents
- `net` - Net amount after fees
- `fee` - Stripe fee
- `type` - Transaction type
- `available_on` - When funds become available

## Filtering Support

The datasource supports filtering on common fields:

- **Email filtering**: Filter customers by email
- **Status filtering**: Filter by status on subscriptions, invoices, payment intents
- **Customer filtering**: Filter resources by customer ID
- **Date filtering**: Filter by created date with operators (gt, gte, lt, lte)
- **Active filtering**: Filter products by active status

## Currency Handling

Stripe uses cents for currency amounts. The datasource provides utility functions:

```javascript
const { formatCurrencyAmount, toCurrencyAmount } = require('@forestadmin/datasource-stripe');

// Convert from cents to decimal
formatCurrencyAmount(1000, 'usd'); // Returns 10.00

// Convert from decimal to cents
toCurrencyAmount(10.00, 'usd'); // Returns 1000
```

## Customization

### Adding Custom Actions

```javascript
agent.customizeCollection('Stripe Customers', collection => {
  collection.addAction('Send Welcome Email', {
    scope: 'Single',
    execute: async (context, resultBuilder) => {
      const customer = await context.getRecord(['id', 'email', 'name']);
      // Send email logic here
      return resultBuilder.success(`Email sent to ${customer.email}`);
    }
  });
});
```

### Adding Computed Fields

```javascript
agent.customizeCollection('Stripe Invoices', collection => {
  collection.addField('amount_due_formatted', {
    columnType: 'String',
    dependencies: ['amount_due', 'currency'],
    getValues: (records) => records.map(r =>
      `${(r.amount_due / 100).toFixed(2)} ${r.currency.toUpperCase()}`
    ),
  });
});
```

## Error Handling

The datasource handles Stripe API errors and provides meaningful error messages. Common errors:

- **Authentication Error**: Invalid or missing API key
- **Resource Missing**: Record not found
- **Invalid Request**: Invalid parameters or operation

## Limitations

1. **Pagination**: Stripe uses cursor-based pagination; page numbers are not supported
2. **Sorting**: Limited sorting options based on Stripe API capabilities
3. **Complex Filters**: Some advanced filtering may require client-side processing
4. **Rate Limits**: Subject to Stripe API rate limits

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines first.

## Support

- [GitHub Issues](https://github.com/anthropics/datasource-stripe/issues)
- [Forest Admin Documentation](https://docs.forestadmin.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
