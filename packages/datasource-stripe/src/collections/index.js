/**
 * Export all Stripe collection classes
 */

const CustomersCollection = require('./customers');
const ProductsCollection = require('./products');
const PricesCollection = require('./prices');
const SubscriptionsCollection = require('./subscriptions');
const InvoicesCollection = require('./invoices');
const PaymentIntentsCollection = require('./payment-intents');
const ChargesCollection = require('./charges');
const RefundsCollection = require('./refunds');
const BalanceTransactionsCollection = require('./balance-transactions');

module.exports = {
  CustomersCollection,
  ProductsCollection,
  PricesCollection,
  SubscriptionsCollection,
  InvoicesCollection,
  PaymentIntentsCollection,
  ChargesCollection,
  RefundsCollection,
  BalanceTransactionsCollection,
};
