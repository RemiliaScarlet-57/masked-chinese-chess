import type { GameState, Piece, PieceType, PieceColor, DarkPieceProbability } from '../renderer/types'
import { INITIAL_PIECE_COUNT } from '../renderer/types'

export function calculateProbabilities(state: GameState): DarkPieceProbability[] {
  const darkPieces = state.pieces.filter(p => !p.isRevealed)
  const result: DarkPieceProbability[] = []
  
  for (const piece of darkPieces) {
    const possibleTypes = new Map<PieceType, number>()
    const remainingForColor = state.remainingPieces.get(piece.color)
    
    if (!remainingForColor) {
      result.push({ pieceId: piece.id, possibleTypes })
      continue
    }
    
    let totalRemaining = 0
    for (const count of remainingForColor.values()) {
      totalRemaining += count
    }
    
    if (totalRemaining === 0) {
      result.push({ pieceId: piece.id, possibleTypes })
      continue
    }
    
    for (const [type, count] of remainingForColor) {
      if (count > 0) {
        possibleTypes.set(type, count / totalRemaining)
      }
    }
    
    result.push({ pieceId: piece.id, possibleTypes })
  }
  
  return result
}

export function getProbabilityForType(probabilities: DarkPieceProbability[], pieceId: string, type: PieceType): number {
  const prob = probabilities.find(p => p.pieceId === pieceId)
  return prob?.possibleTypes.get(type) || 0
}

export function sampleDarkPieceType(probabilities: DarkPieceProbability[], pieceId: string): PieceType | null {
  const prob = probabilities.find(p => p.pieceId === pieceId)
  if (!prob || prob.possibleTypes.size === 0) return null
  
  const rand = Math.random()
  let cumulative = 0
  
  for (const [type, probability] of prob.possibleTypes) {
    cumulative += probability
    if (rand <= cumulative) {
      return type
    }
  }
  
  return null
}

export function generateHypotheticalState(state: GameState): GameState {
  const probabilities = calculateProbabilities(state)
  const newPieces = state.pieces.map(piece => {
    if (piece.isRevealed) {
      return piece
    }
    
    const sampledType = sampleDarkPieceType(probabilities, piece.id)
    return {
      ...piece,
      type: sampledType || piece.type,
      isRevealed: true
    }
  })
  
  return {
    ...state,
    pieces: newPieces,
    darkPieceProbabilities: []
  }
}

export function createInitialRemainingPieces(): Map<PieceColor, Map<PieceType, number>> {
  const remainingPieces = new Map<PieceColor, Map<PieceType, number>>()
  
  for (const color of ['red', 'black'] as PieceColor[]) {
    const map = new Map<PieceType, number>()
    for (const [type, count] of Object.entries(INITIAL_PIECE_COUNT)) {
      map.set(type as PieceType, count)
    }
    remainingPieces.set(color, map)
  }
  
  return remainingPieces
}

export function updateRemainingPiecesOnReveal(
  remainingPieces: Map<PieceColor, Map<PieceType, number>>,
  piece: Piece
): Map<PieceColor, Map<PieceType, number>> {
  const newRemaining = new Map(remainingPieces)
  const colorMap = new Map(newRemaining.get(piece.color)!)
  
  const currentCount = colorMap.get(piece.type) || 0
  colorMap.set(piece.type, Math.max(0, currentCount - 1))
  
  newRemaining.set(piece.color, colorMap)
  return newRemaining
}

export function estimatePieceValue(piece: Piece, probabilities: DarkPieceProbability[]): number {
  if (piece.isRevealed) {
    const PIECE_VALUES: Record<PieceType, number> = {
      king: 10000,
      guard: 200,
      elephant: 200,
      horse: 450,
      chariot: 900,
      cannon: 450,
      soldier: 100
    }
    return PIECE_VALUES[piece.type]
  }
  
  const prob = probabilities.find(p => p.pieceId === piece.id)
  if (!prob) return 0
  
  const PIECE_VALUES: Record<PieceType, number> = {
    king: 10000,
    guard: 200,
    elephant: 200,
    horse: 450,
    chariot: 900,
    cannon: 450,
    soldier: 100
  }
  
  let expectedValue = 0
  for (const [type, probability] of prob.possibleTypes) {
    expectedValue += PIECE_VALUES[type] * probability
  }
  
  return expectedValue
}
