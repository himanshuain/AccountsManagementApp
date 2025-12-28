/**
 * GPay-style UI Components
 * 
 * A collection of components designed to match Google Pay's interface patterns:
 * - Chat-like transaction views
 * - People grid with avatars
 * - Payment progress indicators
 * - Profile sheets with UPI deep links
 * - Bottom tab navigation
 */

// Avatar Components
export { 
  PersonAvatar, 
  PersonAvatarWithName, 
  PersonAvatarSkeleton 
} from './PersonAvatar';

// Grid Components
export { 
  PeopleGrid, 
  PeopleRow 
} from './PeopleGrid';

// Chat Components
export { 
  ChatBubble, 
  PaymentBubble, 
  ChatBubbleSkeleton 
} from './ChatBubble';

// Date/Time Components
export { 
  DateSeparator, 
  MonthHeader, 
  Divider 
} from './DateSeparator';

// Progress Components
export { 
  PaymentProgress, 
  ProgressBar, 
  SummaryStats 
} from './PaymentProgress';

// Filter Components - SegmentedControl re-export
export { SegmentedControl } from './FilterChips';

// Profile Components
export { ProfileSheet } from './ProfileSheet';

// Action Components
export { 
  QuickActionBar, 
  FloatingActionButton, 
  FABMenu, 
  QuickCaptureBar 
} from './QuickActionBar';

// Transaction Row Component (for history view)
export { TransactionRow, TransactionRowSkeleton } from './TransactionRow';

// Filter Components
export { FilterChips } from './FilterChips';

// Chat Header Component
export { ChatHeader } from './ChatHeader';

// Navigation Components
export { BottomTabs } from './BottomTabs';

