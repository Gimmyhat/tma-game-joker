import type { ReactNode } from 'react';
import { HelmetProvider, Helmet } from 'react-helmet-async';

const PageMeta = ({ title, description }: { title: string; description: string }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
  </Helmet>
);

// Cast needed due to React 18/19 type mismatch in monorepo hoisting
export const AppWrapper = ({ children }: { children: ReactNode }) => (
  <HelmetProvider>{children as React.ReactNode}</HelmetProvider>
);

export default PageMeta;
