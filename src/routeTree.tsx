import {
    createRootRoute,
    createRoute,
} from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import Layout from './components/layout';
import Dashboard from './pages/dashboard';
import Extensions from '@/pages/extensions';
import Isolates from '@/pages/isolates';
import Memory from '@/pages/memory';
import Timeline from '@/pages/timeline';
import { Logs } from 'lucide-react';


// Define the context interface to be shared across routes
export interface RouterContext {
    queryClient: QueryClient;
}

// Create the root route with the router context
export const rootRoute = createRootRoute<RouterContext>({
    component: Layout,
});

// Dashboard/Home route
export const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <Dashboard />,
});

// Logs panel route
export const logsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/logs',
    component: () => <Logs />,
});

// Timeline/Performance panel route
export const timelineRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/timeline',
    component: () => <Timeline />,
});

// Memory panel route
export const memoryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/memory',
    component: () => <Memory />,
});

// Isolate inspector route
export const isolatesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/isolates',
    component: () => <Isolates />,
});

// Extension events route
export const extensionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/extensions',
    component: () => <Extensions />,
});

// Build the route tree
export const routeTree = rootRoute.addChildren([
    indexRoute,
    logsRoute,
    timelineRoute,
    memoryRoute,
    isolatesRoute,
    extensionsRoute,
]);

// Build the route tree
