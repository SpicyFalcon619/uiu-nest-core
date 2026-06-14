import Link from 'next/link';

export default function Footer() {
  return (
    <footer id="footer-mount">
      <p>
        &copy; {new Date().getFullYear()} UIUNest &mdash; Student Housing Platform
        &nbsp;&nbsp;
        <Link href="/listings">Browse</Link>
        <Link href="/exchange">Exchange</Link>
        <Link href="/seeking">Seeking</Link>
      </p>
    </footer>
  );
}
