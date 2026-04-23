import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ThreatMapPage from "@/pages/threat-map";
import OpsRoom from "@/pages/ops-room";
import APTTracker from "@/pages/apt-tracker";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ThreatMapPage} />
      <Route path="/ops-room" component={OpsRoom} />
      <Route path="/apt-tracker" component={APTTracker} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
