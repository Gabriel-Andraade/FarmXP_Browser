# Contributing Guidelines

Thank you for your interest in contributing to FarmXP Browser!

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `bun install`
4. Create a feature branch: `git checkout -b feature/your-feature`
5. Make your changes
6. Test locally: `bun run server.ts`
7. Commit and push
8. Open a Pull Request

## Code Style

### JavaScript

- Use ES6+ modules (`import`/`export`)
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`
- Use meaningful variable names
- Comment complex logic in Portuguese or English

**Example:**
```javascript
// Good
const playerSpeed = 5;
const isMoving = keys.KeyW || keys.KeyS;

// Avoid
var s = 5;
var m = keys.KeyW || keys.KeyS;
```

### File Organization

```
scripts/
├── systemName.js       # Main system file
├── systemNameUI.js     # UI-related code (if separate)
└── folder/
    ├── subSystem.js
    └── relatedFile.js
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `inventorySystem.js` |
| Classes | PascalCase | `CollisionSystem` |
| Functions | camelCase | `updatePlayerPosition` |
| Constants | UPPER_SNAKE | `TILE_SIZE` |
| Events | camelCase | `playerInteract` |

## Documentation

### JSDoc Comments

Use JSDoc for public functions and classes:

```javascript
/**
 * Add item to player inventory
 * @param {number} itemId - ID of the item to add
 * @param {number} [quantity=1] - Number of items to add
 * @returns {boolean} True if item was added successfully
 */
function addItem(itemId, quantity = 1) {
    // ...
}
```

### Code Comments

- Comment **why**, not **what** (the code shows what)
- Use Portuguese for game-specific terms if preferred
- Keep comments up-to-date with code changes

## Architecture Guidelines

### Adding a New System

1. Create the system file in `scripts/`
2. Export a singleton instance:
   ```javascript
   class MySystem {
       constructor() { ... }
   }
   export const mySystem = new MySystem();
   ```
3. Import in `main.js` (lazy-load if not critical)
4. Expose on `window` if needed for debugging

### Event Communication

Use custom DOM events for inter-system communication:

```javascript
// Dispatch
document.dispatchEvent(new CustomEvent('myEvent', {
    detail: { data: 'value' }
}));

// Listen
document.addEventListener('myEvent', (e) => {
    console.log(e.detail.data);
});
```

### Lazy Loading

Non-critical systems should load on-demand:

```javascript
let mySystem = null;

async function getMySystem() {
    if (!mySystem) {
        const module = await import('./mySystem.js');
        mySystem = module.mySystem;
    }
    return mySystem;
}
```

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Desktop controls (keyboard + mouse)
- [ ] Mobile controls (touch, joystick)
- [ ] Inventory operations (add, remove, equip)
- [ ] Build mode (place, rotate, align)
- [ ] Merchant interactions (buy, sell)
- [ ] Weather transitions
- [ ] Sleep/wake cycle
- [ ] Collision detection

### Debug Mode

Enable debug features for testing:

```javascript
window.DEBUG_HITBOXES = true;
window.DEBUG_MODE = true;
```

## Pull Request Process

1. **Title**: Brief description of changes
2. **Description**:
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
3. **Screenshots**: Include for UI changes
4. **Breaking changes**: Note any API changes

### PR Checklist

- [ ] Code follows project style
- [ ] No console errors in browser
- [ ] Works on both desktop and mobile
- [ ] Documentation updated (if needed)
- [ ] No hardcoded magic numbers (use constants)

## Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(inventory): add stack splitting
fix(collision): resolve tree hitbox offset
docs: update controls documentation
refactor(weather): simplify particle system
```

## Reporting Issues

When reporting bugs, include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and OS
5. Console errors (if any)
6. Screenshot/video (if visual)

## Questions?

Open an issue with the `question` label for general questions about the codebase.
