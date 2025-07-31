import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// @third-party
import { IntlProvider } from 'react-intl';

/***************************  LOCALIZATION  ***************************/

export default function Locales({ children }) {
  const [messages, setMessages] = useState();

  useEffect(() => {
    // Always use English - locale switching removed
    import('@/utils/locales/en.json').then((d) => {
      setMessages(d.default);
    });
  }, []);

  return (
    <>
      {messages && (
        <IntlProvider locale="en" defaultLocale="en" messages={messages}>
          {children}
        </IntlProvider>
      )}
    </>
  );
}

Locales.propTypes = { children: PropTypes.any };
