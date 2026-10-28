function Test-InvokeResult {
    param([int]$ExitCode, [string]$ErrorOutput)
    if ($ExitCode -ne 0) {
        Write-Host "ERROR: ExitCode=$ExitCode"
        if ($ErrorOutput) { Write-Host $ErrorOutput }
        exit 1
    }
}

$path = 'C:\Users\carlo\Desktop\Proyectos\Proyecto_TiendaNC\Proyecto_Tienda_frontend\src\components\modals\CalculadoraGramajeModal.vue'
$content = [System.IO.File]::ReadAllText($path)

$newStyle = @'
<style scoped>
.scale-modal{--perg-bg:var(--color-bg-primary);--perg-bg-panel:var(--color-bg-panel);--perg-text:var(--color-text-primary);--perg-text-secondary:var(--color-text-secondary);--perg-title:var(--color-accent);--perg-border:var(--color-border);--perg-accent:var(--color-accent);--perg-shadow:var(--color-shadow);--perg-success:var(--color-success);--perg-error:var(--color-error);--perg-warning:var(--color-warning);width:min(100%,400px);position:relative;display:flex;flex-direction:column;align-items:center}
.scale-decor{display:flex;flex-direction:column;align-items:center;width:100%}
.scale-decor.top{margin-bottom:-30px;z-index:1}
.scale-string{width:3px;height:30px;background:linear-gradient(180deg,var(--color-accent) 0%,var(--color-border) 100%)}
.scale-pan{width:140px;height:40px;border-radius:0 0 100px 100px;background:linear-gradient(180deg,var(--color-accent) 0%,var(--color-bg-secondary) 100%);border:none;border-top:none;box-shadow:0 4px 12px var(--color-shadow)}
.scale-modal .modal-card{width:100%;background:var(--color-bg-secondary);border:none;border-radius:var(--radius-lg);box-shadow:8px 8px 24px rgba(0,0,0,0.35),-4px -4px 16px rgba(255,255,255,0.03);overflow:hidden;position:relative;animation:popIn .2s ease-out}
.modal-glow{position:absolute;inset:12px;pointer-events:none;border-radius:8px;box-shadow:inset 0 0 30px color-mix(in srgb,var(--color-accent) 15%,transparent)}
.scale-modal .modal-header{text-align:center;padding:1.25rem 1rem .75rem;border-bottom:1px dashed color-mix(in srgb,var(--color-accent) 30%,transparent);position:relative}
.scale-modal .header-icon{font-size:2rem;margin-bottom:.3rem}
.scale-modal .modal-header h3{color:var(--color-accent);font-size:1.2rem;margin:0;font-weight:700}
.scale-modal .modal-header p{color:var(--color-text-secondary);font-size:.8rem;margin:.15rem 0 0}
.scale-modal .modal-body{padding:1rem 1.25rem;display:flex;flex-direction:column;gap:.75rem}
.scale-modal .form-group{display:flex;flex-direction:column;gap:.4rem}
.scale-modal .form-group label{color:var(--color-text-secondary);font-size:.78rem;font-weight:600}
.scale-modal .product-name{display:flex;align-items:center;gap:.4rem;padding:.6rem;background:var(--color-bg-primary);border:none;border-radius:var(--radius-sm);color:var(--color-text-primary);font-weight:500;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.scale-modal .product-icon{font-size:1.1rem}
.scale-modal .inputs-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.scale-modal .input-block{display:flex;flex-direction:column;gap:.4rem}
.scale-modal .input-block label{color:var(--color-text-secondary);font-size:.78rem;font-weight:600}
.scale-modal .input-wrapper{display:flex;align-items:center;background:var(--color-bg-primary);border:none;border-radius:var(--radius-sm);overflow:hidden;transition:all .15s;box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15)}
.scale-modal .input-wrapper:focus-within{box-shadow:inset 2px 2px 4px rgba(0,0,0,0.15),0 0 0 2px var(--color-accent)}
.scale-modal .input-lg{flex:1;padding:.6rem .65rem;background:transparent;border:none;color:var(--color-text-primary);font-size:1.1rem;font-weight:600;outline:none;width:100%}
.scale-modal .input-lg::placeholder{color:var(--color-text-secondary)}
.scale-modal .input-unit{padding:0 .6rem;color:var(--color-text-secondary);font-weight:500}
.scale-modal .input-wrapper.currency{padding-left:.3rem}
.scale-modal .currency-symbol{padding:0 .15rem 0 .6rem;color:var(--color-success);font-weight:600;font-size:1.1rem}
.scale-modal .quick-buttons{display:flex;gap:.35rem;margin-top:.15rem}
.scale-modal .btn-quick{flex:1;padding:.4rem .15rem;background:var(--color-bg-secondary);border:none;border-radius:var(--radius-sm);color:var(--color-text-secondary);font-size:.7rem;cursor:pointer;transition:all .15s;box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.scale-modal .btn-quick:hover{background:var(--color-accent);color:var(--color-on-brand)}
.scale-modal .precio-kilo-info{display:flex;justify-content:center;gap:.4rem;padding:.6rem;background:var(--color-bg-primary);border:none;border-radius:var(--radius-sm);box-shadow:inset 2px 2px 4px rgba(0,0,0,0.1)}
.scale-modal .precio-kilo-label{color:var(--color-text-secondary);font-size:.8rem}
.scale-modal .precio-kilo-value{color:var(--color-accent);font-weight:600;font-size:.9rem}
.scale-modal .modal-actions{display:flex;gap:.75rem;margin-top:.25rem}
.scale-modal .btn-secondary,.scale-modal .btn-primary{flex:1;padding:.7rem;border-radius:var(--radius-sm);font-size:.9rem;font-weight:600;cursor:pointer;transition:all .15s;border:none}
.scale-modal .btn-secondary{background:var(--color-bg-secondary);color:var(--color-text-secondary);box-shadow:2px 2px 4px rgba(0,0,0,0.1)}
.scale-modal .btn-secondary:hover{color:var(--color-text-primary);box-shadow:4px 4px 8px rgba(0,0,0,0.15)}
.scale-modal .btn-primary{background:linear-gradient(135deg,var(--color-accent),var(--color-accent-hover));color:var(--color-on-brand);box-shadow:3px 3px 6px rgba(0,0,0,0.15)}
.scale-modal .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:5px 5px 10px rgba(0,0,0,0.2)}
.scale-modal .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none}
.loading-indicator{text-align:center;padding:1rem;color:var(--color-text-secondary);font-size:.85rem}
@keyframes popIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}

@media(max-width:480px){
  .scale-modal{width:95vw}
  .scale-pan{width:100px;height:32px}
  .scale-string{height:22px}
  .scale-decor.top{margin-bottom:-24px}
  .scale-modal .inputs-grid{grid-template-columns:1fr}
  .scale-modal .modal-header{padding:1rem .75rem .6rem}
  .scale-modal .modal-body{padding:.75rem 1rem}
  .scale-modal .modal-header h3{font-size:1.05rem}
  .scale-modal .header-icon{font-size:1.6rem}
}
</style>
'@

$ss = $content.IndexOf('<style scoped>')
if ($ss -lt 0) { Write-Host "ERROR: <style scoped> not found"; exit 1 }
$se = $content.IndexOf('</style>', $ss)
if ($se -lt 0) { Write-Host "ERROR: </style> not found"; exit 1 }

$before = $content.Substring(0, $ss)
$after = $content.Substring($se + 8)
$newContent = $before + $newStyle + $after

[System.IO.File]::WriteAllText($path, $newContent, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done. Old CSS removed, new inline styles injected."
