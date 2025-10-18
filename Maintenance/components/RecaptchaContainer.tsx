import React from 'react';
import { Platform } from 'react-native';

interface RecaptchaContainerProps {
  children: React.ReactNode;
}

export default function RecaptchaContainer({ children }: RecaptchaContainerProps) {
  if (Platform.OS === 'web') {
    return (
      <div style={{ position: 'relative' }}>
        {children}
        <div id="recaptcha-container" style={{ position: 'absolute', top: 0, left: 0, opacity: 0 }} />
      </div>
    );
  }
  
  return <>{children}</>;
}
