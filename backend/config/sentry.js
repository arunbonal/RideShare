const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require("@sentry/profiling-node");

function initializeSentry(app) {
    if (!process.env.SENTRY_DSN) {
        console.log('Sentry DSN not found, skipping Sentry initialization');
        return;
    }

    try {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Sentry.Integrations.Express({ app }),
                new ProfilingIntegration(),
            ],
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            environment: process.env.NODE_ENV,
            enabled: process.env.NODE_ENV === 'production',
            beforeSend(event) {
                // Sanitize sensitive data if needed
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
    return {
        requestHandler: Sentry.Handlers.requestHandler(),
        errorHandler: Sentry.Handlers.errorHandler(),
        tracingHandler: Sentry.Handlers.tracingHandler()
    };
}

module.exports = {
    initializeSentry,
    getSentryHandlers,
    Sentry
}; 