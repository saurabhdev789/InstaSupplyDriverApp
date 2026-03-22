import type {Metadata} from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'InstaSupply Push Tester',
  description: 'Temporary screen to create a delivery and trigger push notifications.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
