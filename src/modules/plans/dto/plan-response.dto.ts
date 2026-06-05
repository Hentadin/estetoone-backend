export interface PlanResponseDto {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  priceMonthly: number;
  features: string[];
}
