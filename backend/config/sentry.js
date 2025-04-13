const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require("@sentry/profiling-node");

function initializeSentry(app) {
    // Skip Sentry initialization in development
    if (process.env.NODE_ENV !== 'production') {
        console.log('Development environment detected, Sentry disabled');
        return false;
    }

    if (!process.env.SENTRY_DSN) {
        console.log('Sentry DSN not found, skipping Sentry initialization');
        return false;
    }

    try {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express({ app }),
                new ProfilingIntegration(),
            ],
            tracesSampleRate: 0.1,
            profilesSampleRate: 0.1,
            environment: process.env.NODE_ENV,
            enabled: true,
            minimumBreadcrumbLevel: 'debug',
            minimumEventLevel: 'info',
            beforeSend(event) {
                if (event.level !== 'error' && Math.random() > 0.1) {
                    return null;
                }
                
                if (event.request && event.request.headers) {
                    delete event.request.headers.cookie;
                    delete event.request.headers.authorization;
                }
                return event;
            }
        });

        console.log('Sentry initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize Sentry:', error);
        return false;
    }
}

function getSentryHandlers() {
    // Return no-op handlers in development
    if (process.env.NODE_ENV !== 'production') {
        return {
            requestHandler: (req, res, next) => next(),
            errorHandler: (err, req, res, next) => next(err),
            tracingHandler: (req, res, next) => next()
        };
    }

    return {
        requestHandler: Sentry.Handlers.requestHandler({
            request: ['data', 'headers', 'method', 'query_string', 'url'],
            serverName: true,
            transaction: true
        }),
        errorHandler: Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                return true;
            }
        }),
        tracingHandler: Sentry.Handlers.tracingHandler()
    };
}

module.exports = {
    initializeSentry,
    getSentryHandlers,
    Sentry
}; 