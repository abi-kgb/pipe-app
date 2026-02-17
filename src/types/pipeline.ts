export type ComponentType = 'straight' | 'elbow' | 'elbow-45' | 'vertical' | 't-joint' | 'valve' | 'filter' | 'tank' | 'cap';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PipelineComponent {
  id: string;
  design_id?: string;
  component_type: ComponentType;
  position_x: number;
  position_y: number;
  position_z: number;
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  connections: string[];
  properties: Record<string, unknown>;
  created_at?: string;
}

export interface PipelineDesign {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  is_public: boolean;
}
