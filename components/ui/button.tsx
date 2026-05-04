import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'outline'
}

export function Button({ 
  children, 
  className = "", 
  variant = 'default',
  ...props 
}: ButtonProps) {
  const baseStyle = "px-4 py-2 rounded-lg font-semibold transition-colors"
  const variantStyle = variant === 'default' 
    ? 'bg-blue-600 text-white hover:bg-blue-700' 
    : 'border border-gray-300 hover:bg-gray-100'
  
  return (
    <button 
      className={`${baseStyle} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
