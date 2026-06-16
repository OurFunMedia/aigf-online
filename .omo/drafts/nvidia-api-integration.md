# Draft: NVIDIA API Key & MiniMax M2.7 Integration

## Requirements (confirmed)
- NVIDIA API Key provided by user: `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`
- Model: `minimaxai/minimax-m2.7` via `nvidia/minimax-m2.7`
- API Base URL: `https://integrate.api.nvidia.com/v1`
- Existing plan (`.omo/plans/aigf-online-plan.md`) already covers this in Task 14

## Research Findings
- NVIDIA NIM API is OpenAI-compatible format
- Parameters: temperature=1, top_p=0.95, max_tokens=8192
- No streaming (stream=false in current plan)
- Existing project plan doc (§6.2) has full integration code example

## API Key Verification
- **Status**: ✅ VALID - API responded with HTTP 200
- **Model**: `minimaxai/minimax-m2.7`
- **Latency**: ~5.9s (230B model)
- **Key Format**: OpenAI-compatible, use as `NVIDIA_API_KEY` in `.env.local`

## Agnes AI API Key Verification
- **Status**: ✅ VALID - API responded with HTTP 200, image generated successfully
- **Model**: `agnes-image-2.1-flash`
- **Endpoint**: `POST https://apihub.agnes-ai.com/v1/images/generations`
- **Sample Image URL**: `https://platform-outputs.agnes-ai.space/images/text-to-image/2026/06/62c83530ffc54db5b37d81c5ab574a3e.png`
- **Key Format**: Use as `AGNES_API_KEY` in `.env.local`

## Both API Keys Verified
| Provider | Status | Key Prefix |
|----------|--------|------------|
| NVIDIA MiniMax M2.7 | ✅ Ready | `nvapi-...` |
| Agnes-Image-2.1-Flash | ✅ Ready | `sk-...` |

## Open Questions
- Should both keys be added to the existing plan's `.env.local.example` (Task 6)?
- Is user ready to proceed with execution (`/start-work`)?
