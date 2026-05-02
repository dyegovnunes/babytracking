export interface Pediatrician {
  id: string
  user_id: string
  name: string
  crm: string
  crm_state: string
  rqe: string[] | null
  specialties: string[] | null
  approved_at: string | null
  invite_code: string
  created_at: string
}

export interface PatientRow {
  link_id: string
  linked_at: string
  baby_id: string
  baby_name: string
  birth_date: string
  gender: string
  photo_url: string | null
  last_active_at: string | null
}

export interface EndedPatientRow {
  link_id: string
  unlinked_at: string
  unlink_reason: 'parent' | 'pediatrician'
  baby_id: string
  baby_name: string
  birth_date: string
  gender: string
}
