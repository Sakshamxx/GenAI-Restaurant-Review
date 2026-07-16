# Responsive Design & Mobile-First Guide

## Tailwind CSS Breakpoints

```
xs: 320px  (default - mobile)
sm: 640px  (landscape mobile)
md: 768px  (tablet)
lg: 1024px (desktop)
xl: 1280px (wide desktop)
2xl: 1536px (ultra-wide)
```

## Mobile-First Pattern

Always start with mobile, then add responsive classes:

```jsx
// ❌ Wrong: Desktop-first
<div className="w-full md:w-1/2 lg:w-1/3">

// ✅ Correct: Mobile-first
<div className="w-full lg:w-1/2 xl:w-1/3">
```

## Common Responsive Patterns

### Navigation

```jsx
export default function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile/Tablet: Hamburger */}
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu size={24} />
        </button>

        {/* Desktop: Full Navigation */}
        <div className="hidden lg:flex gap-8">
          {/* Navigation items */}
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden flex flex-col gap-4 py-4">
            {/* Mobile navigation items */}
          </div>
        )}
      </div>
    </nav>
  )
}
```

### Grid Layouts

```jsx
// Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Flex Layouts

```jsx
// Mobile: vertical stack, Desktop: horizontal
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/3">Sidebar</div>
  <div className="w-full md:w-2/3">Content</div>
</div>
```

### Form Inputs

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <input placeholder="First Name" className="w-full px-4 py-2 border rounded-lg" />
  <input placeholder="Last Name" className="w-full px-4 py-2 border rounded-lg" />
</div>
```

## Typography Responsive Scaling

```jsx
// Mobile to Desktop scaling
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Heading
</h1>

<p className="text-sm sm:text-base md:text-lg lg:text-xl">
  Body text
</p>
```

## Spacing Responsive Pattern

```jsx
// Different padding on different screens
<div className="px-4 sm:px-6 md:px-8 lg:px-12">
  {/* px-4 on mobile, px-12 on desktop */}
  <h1 className="mt-4 sm:mt-6 md:mt-8 lg:mt-12">
    Title
  </h1>
</div>
```

## Images & Media

```jsx
// Responsive Images
<img
  src={imageSrc}
  alt="Description"
  className="w-full h-auto object-cover rounded-lg"
  loading="lazy"
/>

// Responsive Video
<div className="relative w-full pb-video-16-9 bg-black rounded-lg overflow-hidden">
  <iframe
    className="absolute inset-0 w-full h-full"
    src="https://www.youtube.com/embed/..."
  />
</div>
```

Add to CSS:
```css
.pb-video-16-9 {
  padding-bottom: 56.25%;
}
```

## Mobile-Specific Features

### Touch-Friendly Buttons

```jsx
// Minimum 44x44px for touch targets
<button className="px-4 py-3 min-h-[44px] min-w-[44px]">
  Action
</button>
```

### Mobile Navigation

```jsx
// Fixed footer navigation for mobile
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:static md:border-t-0">
  <div className="flex md:gap-8 justify-around md:justify-start">
    {/* Navigation items */}
  </div>
</nav>

// Add padding to body to account for fixed nav
<body className="pb-16 md:pb-0">
  {/* Content */}
</body>
```

### Mobile Menu

```jsx
export default function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button - mobile only */}
      <button
        className="lg:hidden"
        onClick={() => setOpen(!open)}
      >
        <Menu />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in menu */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white transform transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu items */}
      </div>
    </>
  )
}
```

## Hide/Show Patterns

```jsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Responsive display
<div className="block md:flex lg:grid">Content</div>
```

## Responsive Containers

```jsx
// Max width pattern
<div className="max-w-2xl mx-auto">
  {/* Max 42rem on all screens, centered */}
</div>

// Full width on mobile, constrained on desktop
<div className="w-full lg:max-w-5xl lg:mx-auto">
  {/* Full width mobile, max-width desktop */}
</div>
```

## Testing Checklist

- [ ] All content fits without horizontal scroll on iPhone 5 (320px)
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable without zooming
- [ ] Images scale properly
- [ ] Forms are easy to fill on mobile
- [ ] Navigation is accessible on all sizes
- [ ] Modal/drawer interactions work on touch
- [ ] Performance is good on slow networks

## Common Mobile Issues & Fixes

### Issue: Text too small
```jsx
// ❌ Wrong
<p className="text-xs">Very small text</p>

// ✅ Correct
<p className="text-base sm:text-sm">Readable text</p>
```

### Issue: Buttons too small
```jsx
// ❌ Wrong
<button className="px-2 py-1">Click</button>

// ✅ Correct
<button className="px-4 py-3 sm:px-3 sm:py-2 touch-friendly">Click</button>
```

### Issue: Images overflow
```jsx
// ❌ Wrong
<img src="large-image.jpg" width="800" height="600" />

// ✅ Correct
<img src="large-image.jpg" className="w-full h-auto" alt="description" />
```

### Issue: Horizontal scroll
```jsx
// ❌ Wrong
<div className="flex gap-4 w-full">
  <div className="w-96">Item</div>
</div>

// ✅ Correct
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Item</div>
</div>
```

## Performance on Mobile

1. **Bundle Size**
   - Keep total JS under 200KB
   - Code split routes
   - Tree shake unused code

2. **Images**
   - Use WebP with PNG fallback
   - Optimize for mobile sizes
   - Lazy load off-screen images

3. **CSS**
   - Minify and purge unused styles
   - Use utility classes (Tailwind)
   - Avoid large CSS files

4. **Animations**
   - Reduce motion for mobile
   - Use GPU-accelerated properties
   - Avoid janky animations

```jsx
// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Conditional animations
const animationProps = prefersReducedMotion
  ? {}
  : { initial: { opacity: 0 }, animate: { opacity: 1 } }

<motion.div {...animationProps}>Content</motion.div>
```

## Viewport Meta Tag

```html
<!-- In index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

This ensures:
- Proper scaling on all devices
- Notch support (iPhone X+)
- No auto-zoom on input focus

