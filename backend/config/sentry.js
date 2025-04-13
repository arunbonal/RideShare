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
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0,
            environment: process.env.NODE_ENV,
            enabled: true,
            debug: true,
            minimumBreadcrumbLevel: 'debug',
            minimumEventLevel: 'info',
            beforeSend(event) {
                console.log('Sending event to Sentry:', {
                    eventId: event.event_id,
                    level: event.level,
                    type: event.type
                });
                
                if (event.request && event.request.headers) {
                    delete event.request.headers.cookie;
                    delete event.request.headers.authorization;
                }
                return event;
            }
        });

        Sentry.captureMessage('Sentry initialization test', {
            level: 'info',
            tags: { test: true }
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