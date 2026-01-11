
"use client";

import { useEffect, useState, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

const ADMIN_PASSWORD = "Gmc!new2026";

interface AuthGuardProps {
    children: ReactNode;
    onLoginSuccess: () => void;
}

export default function AuthGuard({ children, onLoginSuccess }: AuthGuardProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const sessionAuth = sessionStorage.getItem('gmc-auth-passed') === 'true';
    if (sessionAuth) {
      setIsAuthenticated(true);
      onLoginSuccess();
    }
  }, [onLoginSuccess]);


  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setError('');
      sessionStorage.setItem('gmc-auth-passed', 'true');
      setIsAuthenticated(true);
      onLoginSuccess();
    } else {
      setError('Password non corretta.');
      sessionStorage.removeItem('gmc-auth-passed');
    }
  };
  
  if (isAuthenticated) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                <Lock className="w-8 h-8 text-primary" />
            </div>
          <CardTitle>Accesso Riservato</CardTitle>
          <CardDescription>Inserisci la password per accedere all'area di amministrazione.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full">
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
