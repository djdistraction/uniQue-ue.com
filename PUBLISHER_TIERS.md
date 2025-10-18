# Publisher Tiers Documentation

## Overview

The Publisher application now features two tiers: a **Free Tier** with predetermined questions and a **Paid Tier** with AI-powered conversations.

## Free Tier (Standard Version)

### Features
- Predetermined question-based dialogue
- Structured context gathering (8 questions)
- Basic content generation (structured outlines)
- No API costs for users
- Clear upgrade path

### Question Flow
1. What type of content would you like to create?
2. What is the main topic or theme you want to explore?
3. Who is your target audience?
4. What key message or takeaway do you want readers to have?
5. What tone would you like?
6. Are there any specific points or sections you want to include?
7. What length are you aiming for?
8. Do you have a title in mind, or should one be suggested?

### Content Generation
- Generates structured outlines based on answers
- Displays all Q&A responses in organized format
- Provides clear indication to upgrade for fully-formed content

## Paid Tier (AI Mode)

### Pricing
- **One-time activation fee**: $9.99
- **No recurring charges**
- **User provides own API key** (transparent costs)

### Features
- Natural AI-powered conversations
- Adaptive creative dialogue
- Advanced content generation with AI
- Full AI Muse experience
- Settings persisted in browser localStorage

### Activation Flow
1. User clicks "Upgrade to AI" button
2. Upgrade modal displays benefits and pricing
3. Payment simulation (ready for real payment integration)
4. API key setup after successful payment
5. AI mode activated immediately

### API Key Setup
- Users must provide their own Google Gemini API key
- Link provided to obtain free API key: https://makersuite.google.com/app/apikey
- API key stored securely in browser localStorage
- Can be changed/updated later

### AI Conversation
- Free-form natural language dialogue
- AI Muse persona guides creative exploration
- Contextual and adaptive responses
- No predetermined questions

### Content Generation
- Fully-formed creative content
- Based on natural conversation history
- Leverages Google Gemini AI capabilities
- Professional-quality output

## Technical Implementation

### State Management
- Tier status stored in `localStorage` under key `publisherPaidTier`
- API key stored in `localStorage` under key `publisherApiKey`
- Persistent across browser sessions
- Easy reset via browser localStorage clear

### UI Components
1. **Upgrade Button**: Always visible in free tier, disabled in paid tier
2. **Chat Interface**: Adapts messaging based on tier
3. **Upgrade Modal**: Shows pricing and benefits
4. **Payment Modal**: Simulates payment flow (ready for integration)
5. **API Key Modal**: Collects and validates API key

### Data Flow

**Free Tier:**
```
User Answer → Save to userAnswers object → Ask next question → Repeat
Generate → Build structured outline from answers → Display
```

**Paid Tier:**
```
User Message → Add to chatHistory → Call AI API with user's key → Display response
Generate → Call AI API with conversation context → Display content
```

### Integration Points

**Payment Integration** (Ready for implementation):
- Replace `simulatePayment()` function with real payment processor
- Suggested providers: Stripe, PayPal, Square
- Verify payment before enabling API key setup

**API Integration**:
- Uses existing `/.netlify/functions/getAiResponse` endpoint
- Passes user API key in `X-User-API-Key` header
- Backend should validate and use user-provided key

## User Experience

### Free Tier Journey
1. Land on Publisher page
2. See welcome message and first question
3. Answer questions one by one
4. Generate structured outline
5. See "Upgrade to AI" prompt in generated content

### Paid Tier Journey
1. Click "Upgrade to AI" button
2. Review benefits in upgrade modal
3. Complete payment ($9.99 one-time)
4. Set up API key
5. Start AI conversation immediately
6. Generate fully-formed content

### Reset/Clear Data
- Users can clear localStorage to reset to free tier
- No server-side state tracking required
- Simple and privacy-friendly

## Future Enhancements

### Potential Features
- API key management UI (view, update, test)
- Usage tracking and cost estimates
- Multiple AI provider options (OpenAI, Anthropic)
- Content templates and presets
- Export functionality
- Team/collaboration features
- Content history and version control

### Payment Integration
- Real payment processor integration
- Receipt generation
- Payment verification
- Subscription management (if recurring model desired)
- Refund handling

### API Improvements
- Backend validation of user API keys
- Rate limiting per user
- Usage analytics
- Error handling improvements
- Support for multiple AI providers

## Support

### Common Issues

**Free Tier:**
- Q: How do I skip questions?
- A: You must answer questions sequentially; they cannot be skipped.

- Q: Can I edit previous answers?
- A: Not in the current version; answers are saved as you go.

**Paid Tier:**
- Q: Where do I get an API key?
- A: Visit https://makersuite.google.com/app/apikey to create a free Google Gemini API key.

- Q: Is my API key secure?
- A: It's stored locally in your browser and sent directly to the API. Never share it with others.

- Q: How much does API usage cost?
- A: Google Gemini offers free tier usage. Check Google's pricing for details.

- Q: How do I change my API key?
- A: Clear your browser's localStorage or use the settings (when implemented).

### Troubleshooting

**AI not responding:**
1. Check that API key is valid
2. Verify internet connection
3. Check browser console for errors
4. Try clearing localStorage and re-entering API key

**Payment issues:**
1. Contact support (when real payment is integrated)
2. Verify payment method is valid
3. Check for payment confirmation email

## Development

### Testing
- Test free tier: Clear localStorage and reload
- Test paid tier: Complete upgrade flow with test API key
- Test persistence: Close and reopen browser
- Test reset: Clear localStorage manually

### Deployment
- No backend changes required for free tier
- Backend must support user API key validation for paid tier
- Payment processor integration required for production
- Update environment variables as needed

### Code Structure
```
publisher.html
├── HTML structure (unchanged from original)
├── JavaScript
│   ├── State management (isPaidTier, userApiKey, etc.)
│   ├── Question flow logic
│   ├── AI chat logic
│   ├── Content generation (dual mode)
│   ├── Modal management
│   └── Event handlers
```

## Security Considerations

1. **API Keys**: Stored client-side only; consider encryption
2. **Payment**: Use secure, PCI-compliant payment processor
3. **Data Privacy**: No server-side storage of user content
4. **Input Validation**: Both client and server-side validation needed
5. **Rate Limiting**: Implement per-user limits in backend

## Analytics & Metrics

### Recommended Tracking
- Free tier usage rate
- Upgrade conversion rate
- Average questions answered before generation
- AI tier activation success rate
- API key validation failure rate
- Content generation frequency
- Format selection distribution

### Success Metrics
- Conversion rate from free to paid: Target >5%
- User retention after upgrade
- Average session duration
- Content generation completion rate
