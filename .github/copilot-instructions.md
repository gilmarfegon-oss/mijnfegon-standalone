# MijnFegon Standalone App - AI Agent Instructions

## Project Overview
This is a React-based web application for Fegon's customer portal that manages installer registrations, point rewards, and a redemption shop system. The app uses Firebase for authentication and data storage.

## Core Architecture

### Authentication Flow
- User authentication handled via Firebase Auth in `Login.jsx`
- Supports email/password and Google sign-in
- After login, new users must complete profile in `ProfielAanvullen.jsx`

### Data Model (Firestore Collections)
- `users`: User profiles and point balances
- `registrations`: Product registration entries 
- `shop`: Redeemable products catalog
- `purchases`: Shop transaction records
- `punten`: Point balance tracking

### Key Components
- `Admin.jsx` - Administrative dashboard for user/registration management
- `Dashboard.jsx` - Main user interface showing points and registrations
- `Shop.jsx` - Product catalog where users can spend points
- `RegistratieFormulier.jsx` - Form for submitting new product registrations

## Development Patterns

### State Management
- Firebase real-time listeners using `onSnapshot` for live updates
- Local state with React `useState` for form handling
- User context passed down via props

### Forms & Validation
```jsx
const [formData, setFormData] = useState({...});
function handleChange(e) {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
}
```

### Firebase Transactions
Use transactions for point-based operations:
```jsx
await runTransaction(db, async (tx) => {
  // Read current balance
  const snap = await tx.get(saldoRef);
  const current = snap.exists() ? snap.data().totaal : 0;
  
  // Update balance and create record
  tx.set(saldoRef, { totaal: current - points });
  tx.set(purchaseRef, { ...purchaseData });
});
```

### CSS Patterns
- Uses `theme.css` for global styles
- Consistent class naming: `btn`, `btn-primary`, `btn-danger`
- Flexbox layouts with `display: flex` and `gap`
- Card-based UI with `.card` class

## Common Tasks

### Adding New Shop Products
```jsx
await addDoc(collection(db, "shop"), {
  name: productName,
  description: description,
  points: Number(points),
  image: imageUrl,
  createdAt: new Date()
});
```

### Processing Registrations
1. Create registration in `registrations` collection
2. Admin approves/rejects in `RegistratiesAdmin.jsx`
3. Points automatically credited on approval

### User Point Management
- Points credited through registration approvals
- Points deducted through shop purchases
- Admin can manually adjust points in admin panel

## Important Files
- `src/firebase.js` - Firebase configuration and initialization
- `src/styles/theme.css` - Global styles
- `src/components/Admin.jsx` - Core admin functionality
- `src/components/RegistratieFormulier.jsx` - Product registration template