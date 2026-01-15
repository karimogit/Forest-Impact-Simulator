# Deployment Checklist

## Before Deploying

### 1. Update Dependencies
```bash
npm install
```
This will remove the unused three.js packages and update package-lock.json.

### 2. Verify Build
```bash
npm run build
```
Check for:
- No TypeScript errors
- No ESLint errors  
- Build completes successfully
- Bundle size reduced (should see ~500KB savings)

### 3. Test Locally
```bash
npm run dev
```

Test these scenarios:

#### Job Creation
- [ ] Create a small area (< 100m²) - should show 2 jobs
- [ ] Create a medium area (500m²) - should show 2-3 jobs
- [ ] Verify both planting and clear-cutting modes

#### Soil/Climate Data
- [ ] Select various locations worldwide
- [ ] Watch browser console for "Fetching soil data" messages
- [ ] Verify retry logic works if API is slow
- [ ] Check that fallback values work if API fails

#### Tree Selection
- [ ] Search for trees - verify search works
- [ ] Filter by category - verify all categories work
- [ ] Select multiple trees - verify percentages work
- [ ] Use keyboard to navigate and select (Tab, Enter, Space)

#### FAQ Section
- [ ] Click each FAQ item to expand/collapse
- [ ] Verify no items share state (each should work independently)
- [ ] Check items 1-14 all work

#### Accessibility
- [ ] Tab through entire page - verify logical focus order
- [ ] Use a screen reader to test major interactions
- [ ] Verify all interactive elements have labels

### 4. Performance Check
```bash
npm run build
```

Check `.next/static/chunks/` for bundle sizes. You should see:
- Reduction in main bundle size
- No three.js chunks

### 5. Git Commit
```bash
git add .
git commit -m "Fix critical issues: job calc, soil data, remove unused deps, accessibility"
git push
```

## After Deploying

### Monitor for Issues

1. **Check browser console** for any new errors
2. **Test soil data API** in production (sometimes CORS behaves differently)
3. **Verify analytics** - no drop in user engagement
4. **Check error tracking** (if you have Sentry/similar)

### Known Considerations

1. **Soil Data API**: ISRIC SoilGrids can be slow. Retry logic should help but users might still see delays.

2. **Bundle Size**: First load will be noticeably faster due to removing three.js.

3. **Accessibility**: Screen reader users will have much better experience now.

## Rollback Plan

If something breaks:

```bash
git revert HEAD
npm install
npm run build
```

## Support

If you encounter issues:

1. Check browser console for errors
2. Review CHANGES_SUMMARY.md for what was changed
3. Test in different browsers (Chrome, Firefox, Safari)
4. Check with different screen sizes (mobile, tablet, desktop)

## Success Criteria

✅ Job creation shows realistic numbers  
✅ Soil data loads reliably  
✅ Bundle size reduced by ~500KB  
✅ No TypeScript/ESLint errors  
✅ All functionality works as before  
✅ Improved keyboard navigation  
✅ Screen readers work better
