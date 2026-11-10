import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CreateIncidentButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="record-create-incident"
      onClick={onClick}
    >
      <AlertTriangle /> Crear incidencia
    </Button>
  );
}
