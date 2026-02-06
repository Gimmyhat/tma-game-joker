import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GridIcon,
  UserCircleIcon,
  DollarLineIcon,
  ListIcon,
  LockIcon,
  TableIcon,
  TaskIcon,
  MailIcon,
  ShootingStarIcon,
} from '../icons';
import { useSidebar } from '../context/SidebarContext';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: 'Dashboard',
    path: '/',
  },
  {
    icon: <UserCircleIcon />,
    name: 'Users',
    path: '/users',
  },
  {
    icon: <DollarLineIcon />,
    name: 'Transactions',
    path: '/transactions',
  },
  {
    icon: <TaskIcon />,
    name: 'Tasks',
    path: '/tasks',
  },
  {
    icon: <MailIcon />,
    name: 'Notifications',
    path: '/notifications',
  },
  {
    icon: <TableIcon />,
    name: 'Tables',
    path: '/tables',
  },
  {
    icon: <ShootingStarIcon />,
    name: 'Tournaments',
    path: '/tournaments',
  },
  {
    icon: <ListIcon />,
    name: 'Event Log',
    path: '/event-log',
  },
  {
    icon: <LockIcon />,
    name: 'Settings',
    path: '/settings',
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isActive = useCallback(
    (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    [location.pathname],
  );

  // Handle click outside for mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        isMobileOpen
      ) {
        // Close mobile menu
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  return (
    <aside
      ref={sidebarRef}
      className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900
        ${isExpanded || isHovered ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-gray-200 px-4 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-800 dark:text-white">
            {isExpanded || isHovered ? 'Joker Admin' : 'JA'}
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors
                  ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {(isExpanded || isHovered) && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        {(isExpanded || isHovered) && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            Joker Admin Panel v1.0
          </p>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
