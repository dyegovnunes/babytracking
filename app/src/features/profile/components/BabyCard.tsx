import { useState, useRef } from 'react'
import type { Baby } from '../../../types'
import { formatAge, formatBirthDate } from '../../../lib/formatters'
import { supabase } from '../../../lib/supabase'
import ImageCropModal from '../../../components/ui/ImageCropModal'
import Toast from '../../../components/ui/Toast'
import { useBabyPremium } from '../../../hooks/useBabyPremium'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { PaywallModal } from '../../../components/ui/PaywallModal'
import { RewardedAdModal } from '../../../components/ui/RewardedAdModal'

// Limite antes de abrir o ImageCropModal. Fotos HEIC/RAW > 15MB podem dar
// OOM no FileReader em WebView Android — rejeitamos com mensagem clara
// em vez de deixar o crop falhar silenciosamente.
const MAX_PHOTO_SIZE_BYTES = 15 * 1024 * 1024

interface Props {
  baby: Baby
  onSave: (baby: Baby) => void
  canEdit?: boolean
}

export default function BabyCard({ baby, onSave, canEdit = true }: Props) {
  const isPremium = useBabyPremium()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(baby.name)
  const [birthDate, setBirthDate] = useState(baby.birthDate)
  const [uploading, setUploading] = useState(false)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  useSheetBackClose(showPhotoMenu, () => setShowPhotoMenu(false))
  useSheetBackClose(editing, handleCancel)

  async function handlePhotoUpload(blob: Blob) {
    setUploading(true)
    const path = `${baby.id}/photo.jpg`

    try {
      const arrayBuffer = await blob.arrayBuffer()
      const { error } = await supabase.storage
        .from('baby-photos')
        .upload(path, arrayBuffer, { upsert: true, contentType: 'image/jpeg' })

      if (error) {
        console.error('Upload error:', error)
        setPhotoError('Não conseguimos enviar a foto. Verifique sua conexão e tente de novo.')
      } else {
        const { data } = supabase.storage.from('baby-photos').getPublicUrl(path)
        const photoUrl = data.publicUrl + '?t=' + Date.now()
        onSave({ ...baby, photoUrl })
      }
    } catch (err) {
      console.error('Upload exception:', err)
      setPhotoError('Erro inesperado ao enviar foto. Tente novamente.')
    }
    setUploading(false)
  }

  async function handleRemovePhoto() {
    setUploading(true)
    setShowPhotoMenu(false)
    await supabase.storage.from('baby-photos').remove([
      `${baby.id}/photo.jpg`,
      `${baby.id}/photo.png`,
      `${baby.id}/photo.jpeg`,
    ])
    onSave({ ...baby, photoUrl: undefined })
    setUploading(false)
  }

  async function openFilePicker() {
    setShowPhotoMenu(false)
    if (!isPremium) {
      // Free: modal de transição com 3 opções (ver ad / assinar / cancelar).
      // Mesmo padrão do limite de 5 registros (RewardedAdModal).
      setShowUnlockModal(true)
      return
    }
    setTimeout(() => fileRef.current?.click(), 100)
  }

  function handlePhotoClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isPremium) {
      setShowUnlockModal(true)
      return
    }
    if (baby.photoUrl) {
      setShowPhotoMenu(!showPhotoMenu)
    } else {
      openFilePicker()
    }
  }

  function handleAdRewarded() {
    // Ad concluído — libera o file picker uma vez (não persiste unlock).
    setShowUnlockModal(false)
    setTimeout(() => fileRef.current?.click(), 150)
  }

  function handleUpgradeFromUnlock() {
    // Usuário escolheu "Conhecer Yaya+" no modal de unlock → abre paywall.
    setShowPaywall(true)
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

  const photoCircle = (
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
      <div className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${isPremium ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <span className="material-symbols-outlined text-white text-lg">
          {uploading ? 'progress_activity' : isPremium ? 'photo_camera' : 'lock'}
        </span>
      </div>
    </div>
  )

  if (editing) {
    return (
      <>
      <div className="bg-surface-container rounded-md p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            {photoCircle}
            {showPhotoMenu && baby.photoUrl && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPhotoMenu(false)} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-surface-container-high rounded-md shadow-lg overflow-hidden min-w-[160px]">
                  <button onClick={openFilePicker} className="w-full px-4 py-2.5 text-left text-on-surface font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">photo_camera</span>
                    Trocar foto
                  </button>
                  <button onClick={handleRemovePhoto} className="w-full px-4 py-2.5 text-left text-error font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">delete</span>
                    Remover foto
                  </button>
                </div>
              </>
            )}
          </div>
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
              className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
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
              className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input — outside of photo div to avoid event issues */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (fileRef.current) fileRef.current.value = ''
          if (!file) return
          if (file.size > MAX_PHOTO_SIZE_BYTES) {
            setPhotoError('Foto muito grande (acima de 15MB). Escolha uma foto menor ou reduza a qualidade.')
            return
          }
          setCropFile(file)
        }}
      />

      {cropFile && (
        <ImageCropModal
          imageFile={cropFile}
          onConfirm={(blob) => {
            setCropFile(null)
            handlePhotoUpload(blob)
          }}
          onClose={() => setCropFile(null)}
        />
      )}

      {photoError && (
        <Toast
          message={photoError}
          variant="error"
          duration={4000}
          onDismiss={() => setPhotoError(null)}
        />
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="generic"
      />

      <RewardedAdModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onAdCompleted={handleAdRewarded}
        onUpgrade={handleUpgradeFromUnlock}
        icon="photo_camera"
        title="Foto do bebê"
        description="Personalize o perfil com uma foto. Assista um anúncio rápido pra liberar ou assine Yaya+ pra ter sempre."
        adButtonLabel="Assistir vídeo e liberar foto"
        upgradeButtonLabel="Conhecer Yaya+"
      />
      </>
    )
  }

  return (
    <>
    <div className="w-full bg-surface-container rounded-md p-5 flex items-center gap-4">
      <div className="relative">
        {photoCircle}
        {showPhotoMenu && baby.photoUrl && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPhotoMenu(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 bg-surface-container-high rounded-md shadow-lg overflow-hidden min-w-[160px]">
              <button onClick={openFilePicker} className="w-full px-4 py-2.5 text-left text-on-surface font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">photo_camera</span>
                Trocar foto
              </button>
              <button onClick={handleRemovePhoto} className="w-full px-4 py-2.5 text-left text-error font-label text-sm hover:bg-surface-variant/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">delete</span>
                Remover foto
              </button>
            </div>
          </>
        )}
      </div>
      {canEdit ? (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-on-surface font-headline font-bold text-lg">{baby.name}</p>
          <p className="text-on-surface-variant font-label text-sm">
            {formatAge(baby.birthDate)} de vida
          </p>
          <p className="text-on-surface-variant font-label text-xs mt-0.5">
            Nasceu em {formatBirthDate(baby.birthDate)}
          </p>
        </button>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-on-surface font-headline font-bold text-lg">{baby.name}</p>
          <p className="text-on-surface-variant font-label text-sm">
            {formatAge(baby.birthDate)} de vida
          </p>
          <p className="text-on-surface-variant font-label text-xs mt-0.5">
            Nasceu em {formatBirthDate(baby.birthDate)}
          </p>
        </div>
      )}
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-xl">edit</span>
        </button>
      )}
    </div>

    {/* Hidden file input — outside of photo div to avoid event issues */}
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (fileRef.current) fileRef.current.value = ''
        if (!file) return
        if (file.size > MAX_PHOTO_SIZE_BYTES) {
          setPhotoError('Foto muito grande (acima de 15MB). Escolha uma foto menor ou reduza a qualidade.')
          return
        }
        setCropFile(file)
      }}
    />

    {cropFile && (
      <ImageCropModal
        imageFile={cropFile}
        onConfirm={(blob) => {
          setCropFile(null)
          handlePhotoUpload(blob)
        }}
        onClose={() => setCropFile(null)}
      />
    )}

    {photoError && (
      <Toast
        message={photoError}
        variant="error"
        duration={4000}
        onDismiss={() => setPhotoError(null)}
      />
    )}

    <PaywallModal
      isOpen={showPaywall}
      onClose={() => setShowPaywall(false)}
      trigger="generic"
    />

    <RewardedAdModal
      isOpen={showUnlockModal}
      onClose={() => setShowUnlockModal(false)}
      onAdCompleted={handleAdRewarded}
      onUpgrade={handleUpgradeFromUnlock}
      icon="photo_camera"
      title="Foto do bebê"
      description="Personalize o perfil com uma foto. Assista um anúncio rápido pra liberar ou assine Yaya+ pra ter sempre."
      adButtonLabel="Assistir vídeo e liberar foto"
      upgradeButtonLabel="Conhecer Yaya+"
    />
    </>
  )
}
