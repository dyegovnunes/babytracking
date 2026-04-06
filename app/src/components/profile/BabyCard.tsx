import { useState, useRef } from 'react'
import type { Baby } from '../../types'
import { formatAge } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import ImageCropModal from '../ui/ImageCropModal'

interface Props {
  baby: Baby
  onSave: (baby: Baby) => void
}

export default function BabyCard({ baby, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(baby.name)
  const [birthDate, setBirthDate] = useState(baby.birthDate)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(blob: Blob) {
    setUploading(true)
    const path = `${baby.id}/photo.jpg`

    const { error } = await supabase.storage
      .from('baby-photos')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (!error) {
      const { data } = supabase.storage.from('baby-photos').getPublicUrl(path)
      const photoUrl = data.publicUrl + '?t=' + Date.now()
      onSave({ ...baby, photoUrl })
    }
    setUploading(false)
  }

  async function handleRemovePhoto() {
    setUploading(true)
    await supabase.storage.from('baby-photos').remove([
      `${baby.id}/photo.jpg`,
      `${baby.id}/photo.png`,
      `${baby.id}/photo.jpeg`,
    ])
    onSave({ ...baby, photoUrl: undefined })
    setUploading(false)
    setShowPhotoMenu(false)
  }

  function handlePhotoClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (baby.photoUrl) {
      setShowPhotoMenu(!showPhotoMenu)
    } else {
      fileRef.current?.click()
    }
  }

  function handleSave() {
    onSave({ ...baby, name, birthDate })
    setEditing(false)
  }

  function handleCancel() {
    setName(baby.name)
    setBirthDate(baby.birthDate)
    setEditing(false)
  }

  const photoElement = (
    <div className="relative">
      <div
        className="w-16 h-16 rounded-full shrink-0 overflow-hidden bg-primary-container/20 flex items-center justify-center relative cursor-pointer"
        onClick={handlePhotoClick}
      >
        {baby.photoUrl ? (
          <img src={baby.photoUrl} alt={baby.name} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-primary text-3xl">
            child_care
          </span>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <span className="material-symbols-outlined text-white text-lg">
            {uploading ? 'progress_activity' : 'photo_camera'}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setCropFile(file)
            if (fileRef.current) fileRef.current.value = ''
            setShowPhotoMenu(false)
          }}
        />
      </div>

      {/* Photo action menu */}
      {showPhotoMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPhotoMenu(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 bg-surface-container-high rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                fileRef.current?.click()
              }}
              className="w-full px-4 py-2.5 text-left text-on-surface font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">photo_camera</span>
              Trocar foto
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRemovePhoto()
              }}
              className="w-full px-4 py-2.5 text-left text-error font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              Remover foto
            </button>
          </div>
        </>
      )}
    </div>
  )

  const cropModal = cropFile && (
    <ImageCropModal
      imageFile={cropFile}
      onConfirm={(blob) => {
        setCropFile(null)
        handlePhotoUpload(blob)
      }}
      onClose={() => setCropFile(null)}
    />
  )

  if (editing) {
    return (
      <>
      <div className="bg-surface-container rounded-lg p-5">
        <div className="flex items-center gap-4 mb-4">
          {photoElement}
          <p className="font-label text-xs text-on-surface-variant">
            Toque na foto para trocar ou remover
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Data de nascimento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
      {cropModal}
      </>
    )
  }

  return (
    <>
    <div className="w-full bg-surface-container rounded-lg p-5 flex items-center gap-4">
      {photoElement}
      <button
        onClick={() => setEditing(true)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-on-surface font-headline font-bold text-lg">{baby.name}</p>
        <p className="text-on-surface-variant font-label text-sm">
          {formatAge(baby.birthDate)} de vida
        </p>
        <p className="text-on-surface-variant font-label text-xs mt-0.5">
          Nasceu em {new Date(baby.birthDate).toLocaleDateString('pt-BR')}
        </p>
      </button>
      <button
        onClick={() => setEditing(true)}
        className="text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <span className="material-symbols-outlined text-xl">edit</span>
      </button>
    </div>
    {cropModal}
    </>
  )
}
