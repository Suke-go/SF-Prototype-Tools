'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface SliderProps {
  min: number
  max: number
  value: number
  onChange: (value: number) => void
  step?: number
  labels?: {
    min?: string
    max?: string
  }
  className?: string
}

export function Slider({
  min,
  max,
  value,
  onChange,
  step = 1,
  labels,
  className,
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={handleChange}
          className="w-full h-1 bg-student-bg-tertiary rounded-full appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #ffffff 0%, #ffffff ${((value - min) / (max - min)) * 100}%, #404040 ${((value - min) / (max - min)) * 100}%, #404040 100%)`
          }}
        />
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            transition: transform 150ms ease-out;
          }
          .slider::-webkit-slider-thumb:hover {
            transform: scale(1.1);
          }
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            border: none;
            transition: transform 150ms ease-out;
          }
          .slider::-moz-range-thumb:hover {
            transform: scale(1.1);
          }
        `}</style>
      </div>
      {labels && (
        <div className="flex justify-between mt-2 text-sm text-student-text-tertiary">
          <span>{labels.min || min}</span>
          <span className="text-student-text-primary font-medium">{value}</span>
          <span>{labels.max || max}</span>
        </div>
      )}
    </div>
  )
}
