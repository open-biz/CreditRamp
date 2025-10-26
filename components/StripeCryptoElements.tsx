'use client';

import React, { ReactNode } from 'react';

// ReactContext to simplify access of StripeOnramp object
const CryptoElementsContext = React.createContext<{ onramp: any } | null>(null);

interface CryptoElementsProps {
  stripeOnramp: Promise<any> | any;
  children: ReactNode;
}

export const CryptoElements: React.FC<CryptoElementsProps> = ({
  stripeOnramp,
  children,
}) => {
  const [ctx, setContext] = React.useState<{ onramp: any }>({ onramp: null });

  React.useEffect(() => {
    let isMounted = true;

    Promise.resolve(stripeOnramp).then((onramp) => {
      if (onramp && isMounted) {
        setContext((ctx) => (ctx.onramp ? ctx : { onramp }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [stripeOnramp]);

  return (
    <CryptoElementsContext.Provider value={ctx}>
      {children}
    </CryptoElementsContext.Provider>
  );
};

// React hook to get StripeOnramp from context
export const useStripeOnramp = () => {
  const context = React.useContext(CryptoElementsContext);
  return context?.onramp;
};

interface OnrampElementProps extends React.HTMLAttributes<HTMLDivElement> {
  clientSecret: string;
  appearance?: {
    theme?: 'dark' | 'light';
  };
  onReady?: () => void;
  onSessionUpdate?: (session: any) => void;
}

// React element to render Onramp UI
export const OnrampElement: React.FC<OnrampElementProps> = ({
  clientSecret,
  appearance,
  onReady,
  onSessionUpdate,
  ...props
}) => {
  const stripeOnramp = useStripeOnramp();
  const onrampElementRef = React.useRef<HTMLDivElement>(null);
  const sessionRef = React.useRef<any>(null);

  React.useEffect(() => {
    const containerRef = onrampElementRef.current;
    if (containerRef) {
      containerRef.innerHTML = '';

      if (clientSecret && stripeOnramp) {
        console.log('Mounting OnRamp with client secret:', clientSecret.substring(0, 20) + '...');
        
        try {
          const session = stripeOnramp.createSession({
            clientSecret,
            appearance: appearance || { theme: 'dark' },
          });

          // Add event listeners
          if (onReady) {
            session.addEventListener('onramp_ui_loaded', () => {
              console.log('OnRamp UI loaded successfully');
              onReady();
            });
          }

          if (onSessionUpdate) {
            session.addEventListener('onramp_session_updated', (e: any) => {
              console.log('OnRamp session updated:', e.payload.session.status);
              onSessionUpdate(e.payload.session);
            });
          }

          // Add error listener
          session.addEventListener('*', (e: any) => {
            console.log('OnRamp event:', e.type, e);
          });

          session.mount(containerRef);
          sessionRef.current = session;
          console.log('OnRamp session mounted');
        } catch (error) {
          console.error('Error mounting OnRamp:', error);
          containerRef.innerHTML = '<div style="padding: 20px; color: white;">Error loading OnRamp. Check console for details.</div>';
        }
      } else {
        console.warn('Missing clientSecret or stripeOnramp:', { clientSecret: !!clientSecret, stripeOnramp: !!stripeOnramp });
      }
    }

    // Cleanup
    return () => {
      if (sessionRef.current) {
        try {
          sessionRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [clientSecret, stripeOnramp, appearance, onReady, onSessionUpdate]);

  return <div {...props} ref={onrampElementRef}></div>;
};
