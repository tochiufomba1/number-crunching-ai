'use client';

import {
  HomeIcon,
  // BuildingStorefrontIcon,
  ArrowUpOnSquareIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
// import { usePathname } from 'next/navigation';
import styles from './ui_dashboard.module.css'
// import clsx from 'clsx';

// Map of links to display in the side navigation.
// Depending on the size of the application, this would be stored in a database.
const links = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    name: 'Upload',
    href: '/dashboard/upload',
    icon: ArrowUpOnSquareIcon,
  },
  // { name: 'Marketplace', href: '/dashboard/marketplace', icon: BuildingStorefrontIcon },
];

 export default function NavLinks() {
  //const pathname = usePathname();
 
  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={styles.navlinks}
          >
            <LinkIcon className={styles.linkIcon}/>
            <p /*className="hidden md:block"*/>{link.name}</p>
          </Link>
        );
      })}
    </>
  );
}