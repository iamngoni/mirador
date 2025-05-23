import {
    createRootRoute,
    createRoute,
} from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import Layout from './components/layout';


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
    component: () => import('@/pages/dashboard').then((mod) => <mod.default />),
});

// Logs panel route
export const logsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/logs',
    component: () => import('@/pages/logs').then((mod) => <mod.default />),
});

// Timeline/Performance panel route
export const timelineRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/timeline',
    component: () => import('@/pages/timeline').then((mod) => <mod.default />),
});

// Memory panel route
export const memoryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/memory',
    component: () => import('@/pages/memory').then((mod) => <mod.default />),
});

// Isolate inspector route
export const isolatesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/isolates',
    component: () => import('@/pages/isolates').then((mod) => <mod.default />),
});

// Extension events route
export const extensionsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/extensions',
    component: () => import('@/pages/extensions').then((mod) => <mod.default />),
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
