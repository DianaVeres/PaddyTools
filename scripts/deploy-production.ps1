param(
  [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'

$officialRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$marker = Join-Path $officialRoot 'PADDTOOLS_OFICIAL'
$expectedMarker = 'PADDYTOOLS_OFFICIAL_SOURCE_V1'

if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {
  throw 'DESPLIEGUE BLOQUEADO: esta carpeta no contiene el marcador oficial de PaddyTools.'
}

$markerValue = (Get-Content -LiteralPath $marker -Raw).Trim()
if ($markerValue -ne $expectedMarker) {
  throw 'DESPLIEGUE BLOQUEADO: el identificador de la fuente oficial no es válido.'
}

$config = Join-Path $officialRoot 'wrangler.independent.jsonc'
$compiler = Join-Path $officialRoot 'node_modules\.bin\vinext.cmd'
$wrangler = Join-Path $officialRoot 'node_modules\.bin\wrangler.cmd'
$typeScript = Join-Path $officialRoot 'node_modules\.bin\tsc.cmd'
$integrationCheck = Join-Path $officialRoot 'scripts\verify-packing-integration.mjs'
$criticalFlowsCheck = Join-Path $officialRoot 'scripts\verify-critical-flows.mjs'
$schoolMatchingCheck = Join-Path $officialRoot 'scripts\test-school-matching.mjs'
$packingReferencesCheck = Join-Path $officialRoot 'scripts\test-packing-references.mjs'
$packingDatesCheck = Join-Path $officialRoot 'scripts\test-packing-dates.mjs'
$packingExportCheck = Join-Path $officialRoot 'scripts\test-packing-export.mjs'
$httpResponseCheck = Join-Path $officialRoot 'scripts\test-http-response.mjs'
$incidentRecordCheck = Join-Path $officialRoot 'scripts\test-incident-record.mjs'
$incidentStoreCheck = Join-Path $officialRoot 'scripts\test-incident-store.mjs'
$incidentActionsCheck = Join-Path $officialRoot 'scripts\test-incident-actions.mjs'
$incidentWriteCheck = Join-Path $officialRoot 'scripts\test-incident-write.mjs'
$incidentQueryCheck = Join-Path $officialRoot 'scripts\test-incident-query.mjs'
$permissionsCheck = Join-Path $officialRoot 'scripts\test-permissions.mjs'
$apiAccessCheck = Join-Path $officialRoot 'scripts\test-api-access.mjs'
$globalSearchCheck = Join-Path $officialRoot 'scripts\test-global-search.mjs'
$wooCustomerSearchCheck = Join-Path $officialRoot 'scripts\test-woo-customer-search.mjs'
$wooOrderDetailCheck = Join-Path $officialRoot 'scripts\test-woo-order-detail.mjs'
$labelPrintCheck = Join-Path $officialRoot 'scripts\test-label-print.mjs'
$deliveryMessageCheck = Join-Path $officialRoot 'scripts\test-delivery-message.mjs'
$contactLinksCheck = Join-Path $officialRoot 'scripts\test-contact-links.mjs'
$dashboardTypesCheck = Join-Path $officialRoot 'scripts\test-dashboard-types.mjs'
$dashboardCommonCheck = Join-Path $officialRoot 'scripts\test-dashboard-common.mjs'
$dashboardPrintCheck = Join-Path $officialRoot 'scripts\test-dashboard-print.mjs'
$dashboardOrderItemsCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-items.mjs'
$dashboardIncidentCardCheck = Join-Path $officialRoot 'scripts\test-dashboard-incident-card.mjs'
$dashboardMondayCardsCheck = Join-Path $officialRoot 'scripts\test-dashboard-monday-cards.mjs'
$dashboardReservationNotesCheck = Join-Path $officialRoot 'scripts\test-dashboard-reservation-notes.mjs'
$dashboardStoreTicketCheck = Join-Path $officialRoot 'scripts\test-dashboard-store-ticket.mjs'
$dashboardOrderActivityCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-activity.mjs'
$dashboardOrderMovementsCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-movements.mjs'
$dashboardOrderDocumentsCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-documents.mjs'
$dashboardOrderNotesCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-notes.mjs'
$dashboardOrderFollowUpCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-follow-up.mjs'
$dashboardOrderSummaryCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-summary.mjs'
$dashboardOrderHeadingCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-heading.mjs'
$dashboardOrderLinkedRecordsCheck = Join-Path $officialRoot 'scripts\test-dashboard-order-linked-records.mjs'
$dashboardHeaderCheck = Join-Path $officialRoot 'scripts\test-dashboard-header.mjs'
$dashboardGlobalSearchPanelCheck = Join-Path $officialRoot 'scripts\test-dashboard-global-search-panel.mjs'
$dashboardFeedbackCheck = Join-Path $officialRoot 'scripts\test-dashboard-feedback.mjs'
$dashboardConnectedResultsCheck = Join-Path $officialRoot 'scripts\test-dashboard-connected-results.mjs'
$dashboardPrintSheetsCheck = Join-Path $officialRoot 'scripts\test-dashboard-print-sheets.mjs'
$dashboardIncidentDocumentDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-incident-document-dialog.mjs'
$dashboardIncidentPickupSectionCheck = Join-Path $officialRoot 'scripts\test-dashboard-incident-pickup-section.mjs'
$dashboardIncidentDetailsSectionCheck = Join-Path $officialRoot 'scripts\test-dashboard-incident-details-section.mjs'
$dashboardIncidentFormDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-incident-form-dialog.mjs'
$dashboardReservationCustomerSectionCheck = Join-Path $officialRoot 'scripts\test-dashboard-reservation-customer-section.mjs'
$dashboardReservationDetailsSectionCheck = Join-Path $officialRoot 'scripts\test-dashboard-reservation-details-section.mjs'
$dashboardReservationFormDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-reservation-form-dialog.mjs'
$dashboardCustomerMessageDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-customer-message-dialog.mjs'
$dashboardShippingHistoryDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-shipping-history-dialog.mjs'
$dashboardReservationRegistryDialogCheck = Join-Path $officialRoot 'scripts\test-dashboard-reservation-registry-dialog.mjs'
$orderNoteCheck = Join-Path $officialRoot 'scripts\test-order-note.mjs'
$storeTicketCheck = Join-Path $officialRoot 'scripts\test-store-ticket.mjs'
$mondayClientCheck = Join-Path $officialRoot 'scripts\test-monday-client.mjs'
$mondayMappingCheck = Join-Path $officialRoot 'scripts\test-monday-mapping.mjs'
$mondayReadCheck = Join-Path $officialRoot 'scripts\test-monday-read.mjs'
$mondayUpdatesCheck = Join-Path $officialRoot 'scripts\test-monday-updates.mjs'
$mondayWriteCheck = Join-Path $officialRoot 'scripts\test-monday-write.mjs'
$mondayOptionsCheck = Join-Path $officialRoot 'scripts\test-monday-options.mjs'
$mondayReservationsCheck = Join-Path $officialRoot 'scripts\test-monday-reservations.mjs'
$mondaySearchCheck = Join-Path $officialRoot 'scripts\test-monday-search.mjs'
$mondayLookupCheck = Join-Path $officialRoot 'scripts\test-monday-lookup.mjs'
$mondayMaintenanceCheck = Join-Path $officialRoot 'scripts\test-monday-maintenance.mjs'
$productionCheck = Join-Path $officialRoot 'scripts\verify-production.mjs'
$backupScript = Join-Path $officialRoot 'scripts\backup-production.ps1'
$node = (Get-Command node -ErrorAction Stop).Source

foreach ($required in @($config, $compiler, $wrangler, $typeScript, $integrationCheck, $criticalFlowsCheck, $schoolMatchingCheck, $packingReferencesCheck, $packingDatesCheck, $packingExportCheck, $httpResponseCheck, $incidentRecordCheck, $incidentStoreCheck, $incidentActionsCheck, $incidentWriteCheck, $incidentQueryCheck, $permissionsCheck, $apiAccessCheck, $globalSearchCheck, $wooCustomerSearchCheck, $wooOrderDetailCheck, $labelPrintCheck, $deliveryMessageCheck, $contactLinksCheck, $dashboardTypesCheck, $dashboardCommonCheck, $dashboardPrintCheck, $dashboardOrderItemsCheck, $dashboardIncidentCardCheck, $dashboardMondayCardsCheck, $dashboardReservationNotesCheck, $dashboardStoreTicketCheck, $dashboardOrderActivityCheck, $dashboardOrderMovementsCheck, $dashboardOrderDocumentsCheck, $dashboardOrderNotesCheck, $dashboardOrderFollowUpCheck, $dashboardOrderSummaryCheck, $dashboardOrderHeadingCheck, $dashboardOrderLinkedRecordsCheck, $dashboardHeaderCheck, $dashboardGlobalSearchPanelCheck, $dashboardFeedbackCheck, $dashboardConnectedResultsCheck, $dashboardPrintSheetsCheck, $dashboardIncidentDocumentDialogCheck, $dashboardIncidentPickupSectionCheck, $dashboardIncidentDetailsSectionCheck, $dashboardIncidentFormDialogCheck, $dashboardReservationCustomerSectionCheck, $dashboardReservationDetailsSectionCheck, $dashboardReservationFormDialogCheck, $dashboardCustomerMessageDialogCheck, $dashboardShippingHistoryDialogCheck, $dashboardReservationRegistryDialogCheck, $orderNoteCheck, $storeTicketCheck, $mondayClientCheck, $mondayMappingCheck, $mondayReadCheck, $mondayUpdatesCheck, $mondayWriteCheck, $mondayOptionsCheck, $mondayReservationsCheck, $mondaySearchCheck, $mondayLookupCheck, $mondayMaintenanceCheck, $productionCheck, $backupScript, $node)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "DESPLIEGUE BLOQUEADO: falta el archivo requerido $required"
  }
}

if ($ValidateOnly) {
  Write-Host "Fuente oficial validada: $officialRoot" -ForegroundColor Green
  exit 0
}

Push-Location $officialRoot
try {
  Write-Host 'Comprobando la integración y los tipos...' -ForegroundColor Cyan
  & $node $integrationCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de PackingList ha fallado. No se desplegará nada."
  }
  & $node $criticalFlowsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de los flujos críticos ha fallado. No se desplegará nada."
  }
  & $node $schoolMatchingCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La comparación de colegios ha fallado. No se desplegará nada."
  }
  & $node $packingReferencesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La interpretación de referencias de PackingList ha fallado. No se desplegará nada."
  }
  & $node $packingDatesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La agrupación por fechas de PackingList ha fallado. No se desplegará nada."
  }
  & $node $packingExportCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La generación del documento de PackingList ha fallado. No se desplegará nada."
  }
  & $node $httpResponseCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La lectura segura de respuestas ha fallado. No se desplegará nada."
  }
  & $node $incidentRecordCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los datos imprimibles de incidencias han fallado. No se desplegará nada."
  }
  & $node $incidentStoreCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El almacenamiento de incidencias ha fallado. No se desplegará nada."
  }
  & $node $incidentActionsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las acciones de incidencias han fallado. No se desplegará nada."
  }
  & $node $incidentWriteCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El guardado de incidencias ha fallado. No se desplegará nada."
  }
  & $node $incidentQueryCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La consulta de incidencias ha fallado. No se desplegará nada."
  }
  & $node $permissionsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los permisos de usuarios han fallado. No se desplegará nada."
  }
  & $node $apiAccessCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La protección de las API ha fallado. No se desplegará nada."
  }
  & $node $globalSearchCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La normalización de la búsqueda global ha fallado. No se desplegará nada."
  }
  & $node $wooCustomerSearchCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La búsqueda de clientes en WooCommerce ha fallado. No se desplegará nada."
  }
  & $node $wooOrderDetailCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El detalle de pedidos WooCommerce ha fallado. No se desplegará nada."
  }
  & $node $labelPrintCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La impresión independiente de etiquetas ha fallado. No se desplegará nada."
  }
  & $node $deliveryMessageCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los mensajes de entrega han fallado. No se desplegará nada."
  }
  & $node $contactLinksCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los enlaces de correo y WhatsApp han fallado. No se desplegará nada."
  }
  & $node $dashboardTypesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los modelos del panel principal han fallado. No se desplegará nada."
  }
  & $node $dashboardCommonCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los elementos comunes del panel principal han fallado. No se desplegará nada."
  }
  & $node $dashboardPrintCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los impresos del panel principal han fallado. No se desplegará nada."
  }
  & $node $dashboardOrderItemsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La tarjeta de artículos del pedido ha fallado. No se desplegará nada."
  }
  & $node $dashboardIncidentCardCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La tarjeta de incidencia ha fallado. No se desplegará nada."
  }
  & $node $dashboardMondayCardsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las tarjetas de Monday han fallado. No se desplegará nada."
  }
  & $node $dashboardReservationNotesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La tarjeta de notas de reserva ha fallado. No se desplegará nada."
  }
  & $node $dashboardStoreTicketCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La tarjeta de ticket de tienda ha fallado. No se desplegará nada."
  }
  & $node $dashboardOrderActivityCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La actividad del pedido ha fallado. No se desplegará nada."
  }
  & $node $dashboardOrderMovementsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los movimientos del pedido han fallado. No se desplegará nada."
  }
  & $node $dashboardOrderDocumentsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los documentos del pedido han fallado. No se desplegará nada."
  }
  & $node $dashboardOrderNotesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las notas del pedido han fallado. No se desplegará nada."
  }
  & $node $dashboardOrderFollowUpCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El seguimiento del pedido ha fallado. No se desplegará nada."
  }
  & $node $dashboardOrderSummaryCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El resumen del pedido ha fallado. No se desplegará nada."
  }
  & $node $dashboardOrderHeadingCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La cabecera del pedido ha fallado. No se desplegará nada."
  }
  & $node $dashboardOrderLinkedRecordsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los registros conectados del pedido han fallado. No se desplegará nada."
  }
  & $node $dashboardHeaderCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La cabecera principal ha fallado. No se desplegará nada."
  }
  & $node $dashboardGlobalSearchPanelCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La consulta global ha fallado. No se desplegará nada."
  }
  & $node $dashboardFeedbackCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los estados de consulta han fallado. No se desplegará nada."
  }
  & $node $dashboardConnectedResultsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los resultados conectados han fallado. No se desplegará nada."
  }
  & $node $dashboardPrintSheetsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las hojas de impresión han fallado. No se desplegará nada."
  }
  & $node $dashboardIncidentDocumentDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El diálogo de documento de incidencia ha fallado. No se desplegará nada."
  }
  & $node $dashboardIncidentPickupSectionCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La recogida del formulario de incidencias ha fallado. No se desplegará nada."
  }
  & $node $dashboardIncidentDetailsSectionCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los datos del formulario de incidencias han fallado. No se desplegará nada."
  }
  & $node $dashboardIncidentFormDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El formulario completo de incidencias ha fallado. No se desplegará nada."
  }
  & $node $dashboardReservationCustomerSectionCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los datos de cliente del formulario de reservas han fallado. No se desplegará nada."
  }
  & $node $dashboardReservationDetailsSectionCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los detalles del formulario de reservas han fallado. No se desplegará nada."
  }
  & $node $dashboardReservationFormDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El formulario completo de reservas ha fallado. No se desplegará nada."
  }
  & $node $dashboardCustomerMessageDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El diálogo de email y WhatsApp ha fallado. No se desplegará nada."
  }
  & $node $dashboardShippingHistoryDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El diálogo de histórico de envíos ha fallado. No se desplegará nada."
  }
  & $node $dashboardReservationRegistryDialogCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El registro de reservas ha fallado. No se desplegará nada."
  }
  & $node $orderNoteCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las notas internas han fallado. No se desplegará nada."
  }
  & $node $storeTicketCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los tickets de tienda han fallado. No se desplegará nada."
  }
  & $node $mondayClientCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El cliente de Monday ha fallado. No se desplegará nada."
  }
  & $node $mondayMappingCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El mapeo de Monday ha fallado. No se desplegará nada."
  }
  & $node $mondayReadCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las lecturas de Monday han fallado. No se desplegará nada."
  }
  & $node $mondayUpdatesCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Los comentarios de Monday han fallado. No se desplegará nada."
  }
  & $node $mondayWriteCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La escritura de Monday ha fallado. No se desplegará nada."
  }
  & $node $mondayOptionsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "Las opciones de reservas Monday han fallado. No se desplegará nada."
  }
  & $node $mondayReservationsCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La lectura de reservas Monday ha fallado. No se desplegará nada."
  }
  & $node $mondaySearchCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La búsqueda de registros Monday ha fallado. No se desplegará nada."
  }
  & $node $mondayLookupCheck
  if ($LASTEXITCODE -ne 0) {
    throw "La consulta exacta de Monday ha fallado. No se desplegará nada."
  }
  & $node $mondayMaintenanceCheck
  if ($LASTEXITCODE -ne 0) {
    throw "El mantenimiento de Monday ha fallado. No se desplegará nada."
  }
  & $typeScript --noEmit
  if ($LASTEXITCODE -ne 0) {
    throw "La comprobación de TypeScript ha fallado. No se desplegará nada."
  }

  Write-Host 'Fuente oficial verificada. Compilando PaddyTools...' -ForegroundColor Cyan
  & $compiler build
  if ($LASTEXITCODE -ne 0) {
    throw "La compilación ha fallado con el código $LASTEXITCODE. No se desplegará nada."
  }

  Write-Host 'Creando copias de seguridad de las bases de datos...' -ForegroundColor Cyan
  & powershell -NoProfile -ExecutionPolicy Bypass -File $backupScript
  if ($LASTEXITCODE -ne 0) {
    throw "La copia de seguridad ha fallado. No se aplicarán migraciones ni se desplegará nada."
  }

  Write-Host 'Aplicando migraciones aditivas de la base de datos...' -ForegroundColor Cyan
  & $wrangler d1 migrations apply gestion-unificada-db --remote --config $config
  if ($LASTEXITCODE -ne 0) {
    throw "La migración de D1 ha fallado. No se desplegará la aplicación."
  }

  Write-Host 'Compilación correcta. Desplegando el resultado recién generado...' -ForegroundColor Cyan
  & $wrangler deploy --config $config
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare ha rechazado el despliegue con el código $LASTEXITCODE."
  }

  Write-Host 'Comprobando la aplicación ya desplegada...' -ForegroundColor Cyan
  $productionVerified = $false
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    & $node $productionCheck
    if ($LASTEXITCODE -eq 0) {
      $productionVerified = $true
      break
    }
    if ($attempt -lt 3) {
      Write-Warning "La comprobación de producción ha fallado (intento $attempt de 3). Se repetirá en 5 segundos."
      Start-Sleep -Seconds 5
    }
  }

  if (-not $productionVerified) {
    Write-Warning 'La nueva versión no ha superado las comprobaciones. Restaurando la versión anterior...'
    & $wrangler rollback --config $config --message "Rollback automático: falló la verificación funcional posterior al despliegue" --yes
    if ($LASTEXITCODE -ne 0) {
      throw "ALERTA: la versión nueva falló y Cloudflare no pudo restaurar automáticamente la anterior."
    }

    Write-Host 'Versión anterior restaurada. Comprobando la recuperación...' -ForegroundColor Yellow
    & $node $productionCheck
    if ($LASTEXITCODE -ne 0) {
      throw "ALERTA: se restauró la versión anterior, pero la comprobación funcional continúa fallando."
    }
    throw "El despliegue nuevo no era válido. PaddyTools ha vuelto automáticamente a la versión anterior verificada."
  }

  Write-Host 'PaddyTools se ha desplegado y verificado desde la fuente oficial.' -ForegroundColor Green
}
finally {
  Pop-Location
}

