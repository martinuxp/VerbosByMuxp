
'use client';

import { useState } from 'react';
import { Swords, Users, Plus, UserPlus, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { verbLists } from '@/lib/verb-lists';
import { createMatch, joinMatch } from '@/services/versus';
import { useToast } from '@/hooks/use-toast';
import { playConfirmSound, playSelectSound } from '@/lib/sounds';

type VersusLobbyProps = {
  onStartMatch: (roomCode: string, playerId: string, isHost: boolean) => void;
};

export function VersusLobby({ onStartMatch }: VersusLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'main' | 'create' | 'join'>('main');
  const { toast } = useToast();

  const handleCreate = async (listName: string) => {
    if (!playerName.trim()) {
      toast({ title: "Falta tu nombre", description: "Escribe cómo te llamas antes de crear la sala.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const id = Math.random().toString(36).substring(7);
    try {
      const code = await createMatch(listName, playerName, id);
      playConfirmSound();
      onStartMatch(code, id, true);
    } catch (e) {
      toast({ title: "Error", description: "No se pudo crear la sala.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({ title: "Campos incompletos", description: "Necesitamos tu nombre y el código de la sala.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const id = Math.random().toString(36).substring(7);
    try {
      const success = await joinMatch(roomCode, playerName, id);
      if (success) {
        playConfirmSound();
        onStartMatch(roomCode.toUpperCase(), id, false);
      } else {
        toast({ title: "Error al unirse", description: "Sala llena, inexistente o ya iniciada.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Hubo un problema al conectar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (view === 'main') {
    return (
      <div className="flex flex-col gap-6 p-4">
        <Alert className="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400">
          <AlertCircle className="h-4 w-4 stroke-current" />
          <AlertTitle className="font-bold">Aviso sobre los duelos</AlertTitle>
          <AlertDescription>
            Debido a las restricciones de SupaBase para mantener el servidor de duelos activo, la sección de duelo a veces puede no funcionar correctamente.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Button
            variant="outline"
            className="h-48 flex flex-col gap-4 text-xl font-bold border-2 border-primary/20 bg-surface-container hover:bg-primary/10 transition-all"
            onClick={() => { playSelectSound(); setView('create'); }}
          >
            <Plus size={48} className="text-primary" />
            Crear Sala
          </Button>
          <Button
            variant="outline"
            className="h-48 flex flex-col gap-4 text-xl font-bold border-2 border-secondary/20 bg-surface-container hover:bg-secondary/10 transition-all"
            onClick={() => { playSelectSound(); setView('join'); }}
          >
            <UserPlus size={48} className="text-secondary" />
            Unirse a Sala
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-xl mx-auto border-0 bg-surface-container-low shadow-2xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary mb-2">
          <Button variant="ghost" size="sm" onClick={() => setView('main')}>← Volver</Button>
        </div>
        <CardTitle className="text-3xl font-black flex items-center gap-2">
          {view === 'create' ? 'Nueva Batalla' : 'Entrar a Combate'}
          <Swords className="text-primary" />
        </CardTitle>
        <CardDescription>
          {view === 'create' ? 'Elige una lista y comparte el código con tu rival.' : 'Ingresa el código que te pasó tu amigo.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="font-bold">Tu nombre de batalla</Label>
          <Input
            placeholder="Ej: VerboMaster"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="h-12 text-lg bg-surface-container border-0"
            maxLength={12}
          />
        </div>

        {view === 'create' ? (
          <div className="space-y-4">
            <Label className="font-bold">Selecciona la Lista</Label>
            <div className="grid gap-2">
              {verbLists.map((list) => (
                <Button
                  key={list.name}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 bg-surface-container hover:bg-primary/10 border-0 text-left"
                  onClick={() => handleCreate(list.name)}
                  disabled={loading}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-base">{list.name}</span>
                    <span className="text-xs text-muted-foreground">{list.description}</span>
                  </div>
                  {loading && <Loader2 className="ml-auto animate-spin" />}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold">Código de Sala</Label>
              <Input
                placeholder="ABCDEF"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="h-14 text-center text-3xl font-black tracking-widest bg-surface-container border-0"
                maxLength={6}
              />
            </div>
            <Button
              className="w-full h-14 text-lg font-bold"
              onClick={handleJoin}
              disabled={loading || !roomCode}
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
              ¡ENTRAR AL DUELO!
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
