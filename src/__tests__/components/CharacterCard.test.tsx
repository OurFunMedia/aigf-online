import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterCard } from '@/components/character/CharacterCard'
import type { Character } from '@/types/database'

const mockCharacter: Character = {
  id: 'char-1',
  user_id: 'user-1',
  name: '小美',
  avatar_url: null,
  personality_prompt: '你是一個溫柔體貼的台灣女孩，喜歡美食',
  visual_template: 'asian girl, long black hair, casual wear',
  body_params: {
    age: 22,
    height: 'medium',
    body_type: 'average',
    bust: 'medium',
    waist: 'medium',
    hip_width: 'medium',
    hip_shape: 'round',
    style: 'cute',
    hair_color: 'black',
    hair_style: 'long-straight',
  },
  relation_points: 42,
  created_at: '2026-01-01T00:00:00.000Z',
}

describe('CharacterCard', () => {
  it('renders character name', () => {
    render(<CharacterCard character={mockCharacter} />)
    expect(screen.getByText('小美')).toBeDefined()
  })

  it('renders avatar initial when no avatar_url', () => {
    render(<CharacterCard character={mockCharacter} />)
    expect(screen.getByText('小')).toBeDefined()
  })

  it('renders personality preview (truncated)', () => {
    render(<CharacterCard character={mockCharacter} />)
    expect(screen.getByText('你是一個溫柔體貼的台灣女孩，喜歡美食')).toBeDefined()
  })

  it('renders relation points', () => {
    render(<CharacterCard character={mockCharacter} />)
    expect(screen.getByText('42')).toBeDefined()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<CharacterCard character={mockCharacter} onClick={onClick} />)
    fireEvent.click(screen.getByText('小美'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders avatar image when avatar_url is provided', () => {
    const charWithAvatar = { ...mockCharacter, avatar_url: 'https://img.test/avatar.png' }
    render(<CharacterCard character={charWithAvatar} />)
    const img = screen.getByAltText('小美') as HTMLImageElement
    expect(img.src).toContain('https://img.test/avatar.png')
  })
})
