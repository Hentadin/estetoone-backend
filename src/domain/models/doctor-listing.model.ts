export function toDoctorListingResponse(doctor: {
  id: string;
  name: string;
  mainSpecialty: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  isOnline: boolean;
  consultationFee: { toNumber(): number } | null;
}) {
  return {
    id: doctor.id,
    name: doctor.name,
    mainSpecialty: doctor.mainSpecialty,
    bio: doctor.bio,
    profilePhotoUrl: doctor.profilePhotoUrl,
    isOnline: doctor.isOnline,
    consultationFee: doctor.consultationFee ? doctor.consultationFee.toNumber() : null,
  };
}

export function toDoctorDetailResponse(doctor: {
  id: string;
  name: string;
  crm: string;
  rqe: string | null;
  mainSpecialty: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  isOnline: boolean;
  consultationFee: { toNumber(): number } | null;
  availability: unknown;
}) {
  return {
    ...toDoctorListingResponse(doctor),
    crm: doctor.crm,
    rqe: doctor.rqe,
    availability: doctor.availability ?? null,
  };
}
