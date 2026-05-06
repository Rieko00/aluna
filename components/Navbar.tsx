'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Scan, LayoutGrid, FileText, Bell, User, X, ChevronDown, Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/mode-toggle';

const navLinks = [
  { href: '/', label: 'Home', icon: null },
  { href: '/scan', label: 'Scan', icon: Scan },
  { href: '/download', label: 'Download', icon: Download },
  { href: '/about', label: 'About', icon: FileText },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="header">
      <div className="header-brand">
        <Link href="/" className="header-brand">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/logo.png" alt="ALUNA Logo" width={32} height={32} style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <div className="header-title">ALUNA</div>
            <div className="header-subtitle">AI Lung Analyzer</div>
          </div>
        </Link>
      </div>

      <nav className="header-nav">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${pathname === href ? 'active' : ''}`}
          >
            {Icon && <Icon size={16} />} {label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <div className="header-badge">
          <span className="status-dot" />
          v1.0.0
        </div>
        <div className="header-divider" />

        <ModeToggle />


        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="icon-btn" title="Profile">
              <User size={20} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={12}>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ color: 'var(--malignant)' }}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
