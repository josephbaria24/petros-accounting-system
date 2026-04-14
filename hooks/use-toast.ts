"use client"

import * as React from "react"
import { sileo } from "sileo"

type ToastVariant = "default" | "destructive"

type ToastArgs = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
}

function toTitleString(node: React.ReactNode): string | undefined {
  if (node == null || node === false) return undefined
  if (typeof node === "string" || typeof node === "number") return String(node)
  return undefined
}

function toast({ title, description, variant }: ToastArgs) {
  const titleStr = toTitleString(title)
  const opts = {
    ...(titleStr !== undefined && titleStr !== "" ? { title: titleStr } : {}),
    description: description as React.ReactNode | string | undefined,
    position: "top-center" as const,
  }

  const id =
    variant === "destructive" ? sileo.error(opts) : sileo.success(opts)

  return {
    id,
    dismiss: () => sileo.dismiss(id),
    update: (_props: ToastArgs) => {},
  }
}

function useToast() {
  return {
    toasts: [] as { id: string; title?: React.ReactNode; description?: React.ReactNode }[],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) sileo.dismiss(toastId)
      else sileo.clear()
    },
  }
}

export { useToast, toast }
