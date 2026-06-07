"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Card Member" },
  { href: "/isp", label: "ISP (Colleague)" },
  { href: "/admin", label: "Audit" },
];

export default function TopBar({ dark = false }: { dark?: boolean }) {
  const path = usePathname();
  return (
    <div className={"topbar" + (dark ? " dark" : "")}>
      <div className="wrap inner">
        <Link href="/" className="brand">
          <span className="acer-dot">A</span>
          <span className="acer-name">
            ACER <span>/ ACE Resolve</span>
          </span>
        </Link>
        <div className="navlinks">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={"navlink" + (path?.startsWith(l.href) ? " active" : "")}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="divtag">Servicing Capabilities &amp; Innovation</div>
      </div>
    </div>
  );
}
