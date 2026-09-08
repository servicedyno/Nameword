# Sentry Integration Setup

This project has been configured with Sentry for error tracking and performance monitoring. Sentry is only enabled in the production environment.

## Configuration

### Environment Variables

Add the following environment variables to your production environment:

```env
# Sentry Configuration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Environment Variables Explained

-   `SENTRY_DSN`: Your Sentry project's DSN (Data Source Name) - required for Sentry to work
-   `SENTRY_ENVIRONMENT`: The environment name (defaults to 'production')
-   `SENTRY_TRACES_SAMPLE_RATE`: Percentage of transactions to sample for performance monitoring (0.0 to 1.0)
-   `SENTRY_PROFILES_SAMPLE_RATE`: Percentage of transactions to profile (0.0 to 1.0)

## Features

### Error Tracking

-   Automatic capture of unhandled exceptions
-   Manual error reporting through utility functions
-   Error filtering and customization

### Performance Monitoring

-   HTTP request tracing
-   Express.js middleware tracing
-   Custom transaction monitoring
-   Performance profiling

### User Context

-   Automatic user identification for authenticated requests
-   Request metadata tagging
-   Custom context and breadcrumbs

## Usage

### Basic Error Reporting

```javascript
const { captureException, captureMessage } = require("./app/utils/sentry");

// Capture an exception
try {
	// Some risky operation
} catch (error) {
	captureException(error, {
		context: "user-operation",
		userId: req.user?.id,
	});
}

// Capture a message
captureMessage("User performed action", "info", {
	action: "login",
	userId: req.user?.id,
});
```

### Performance Monitoring

```javascript
const { startTransaction } = require("./app/utils/sentry");

// Start a custom transaction
const transaction = startTransaction("database-query", "db");
if (transaction) {
	// Your database operation
	transaction.finish();
}
```

### Adding Breadcrumbs

```javascript
const { addBreadcrumb } = require("./app/utils/sentry");

// Add breadcrumb for debugging
addBreadcrumb("User clicked button", "ui.click", {
	buttonId: "submit-form",
	page: "/dashboard",
});
```

### Setting Context

```javascript
const { setUser, setTag, setExtra } = require("./app/utils/sentry");

// Set user context
setUser({
	id: user.id,
	email: user.email,
	username: user.username,
});

// Set tags
setTag("feature", "payment");
setTag("plan", "premium");

// Set extra context
setExtra("order_id", order.id);
setExtra("amount", order.amount);
```

## Middleware Integration

The Sentry context middleware is automatically applied to set user context for authenticated requests. You can add it to your routes:

```javascript
const setSentryContext = require("./app/middlewares/sentry-context");

// Apply to specific routes
app.use("/api", setSentryContext, apiRoutes);

// Or apply globally
app.use(setSentryContext);
```

## Error Filtering

The Sentry configuration includes error filtering to reduce noise:

-   404 errors are filtered out
-   Network and timeout errors are ignored
-   Favicon requests are ignored

You can customize this in `start/sentry.js`.

## Development vs Production

-   **Development**: Sentry is disabled, no data is sent
-   **Production**: Sentry is enabled when `SENTRY_DSN` is provided
-   **Testing**: Sentry is disabled to avoid test noise

## Monitoring

Once configured, you can monitor:

-   Error rates and trends
-   Performance bottlenecks
-   User experience issues
-   API response times
-   Database query performance

## Best Practices

1. **Don't log sensitive data**: Avoid logging passwords, tokens, or PII
2. **Use appropriate log levels**: Use 'info' for general events, 'warning' for concerning events, 'error' for actual errors
3. **Add context**: Always provide relevant context when reporting errors
4. **Monitor performance**: Use transactions to identify slow operations
5. **Set up alerts**: Configure Sentry alerts for critical errors

## Troubleshooting

### Sentry not working in production

-   Check that `NODE_ENV=production`
-   Verify `SENTRY_DSN` is set correctly
-   Check console logs for Sentry initialization messages

### Too many errors being reported

-   Adjust error filtering in `start/sentry.js`
-   Use `beforeSend` hook to filter specific errors
-   Review and update `ignoreErrors` configuration

### Performance impact

-   Adjust sample rates for traces and profiles
-   Use transactions sparingly for critical paths only
-   Monitor Sentry's own performance impact
