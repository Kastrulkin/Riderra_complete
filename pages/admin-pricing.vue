<template>
  <div>
    <div class="page-background"><div class="page-background__gradient"></div><div class="page-background__overlay"></div></div>
    <section class="site-section site-section--pf admin-section">
      <div class="container">
        <admin-tabs />

        <div class="section-actions">
          <button class="btn btn--ghost" @click="reloadAll">{{ t.refresh }}</button>
          <button class="btn" @click="downloadEtaTemplate">{{ t.etaTemplate }}</button>
        </div>

        <div class="overview-strip">
          <div v-for="card in overviewCards" :key="card.key" class="overview-card" :class="`overview-card--${card.tone}`">
            <div class="overview-card__value">{{ card.value }}</div>
            <div class="overview-card__label">{{ card.label }}</div>
            <div class="overview-card__hint">{{ card.hint }}</div>
          </div>
        </div>

        <div class="subtabs">
          <button class="subtab" :class="{ 'subtab--active': tab==='base' }" @click="tab='base'">{{ t.base }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='opportunities' }" @click="tab='opportunities'">{{ t.opportunities }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='booking' }" @click="tab='booking'">{{ t.bookingCalculation }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='counterparty' }" @click="tab='counterparty'">{{ t.counterparty }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='driver' }" @click="tab='driver'">{{ t.driver }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='conflicts' }" @click="tab='conflicts'">{{ t.conflicts }}</button>
          <button class="subtab" :class="{ 'subtab--active': tab==='adjustments' }" @click="tab='adjustments'">{{ t.adjustments }}</button>
        </div>

        <div class="toolbar">
          <input v-model="q" class="input toolbar-search" :placeholder="searchPlaceholder" />
          <button v-if="tab==='base'" class="btn btn--primary" @click="openBaseForm()">{{ t.addRow }}</button>
          <button v-if="tab==='conflicts'" class="btn btn--danger" @click="recalc">{{ t.recalc }}</button>
        </div>

        <div v-if="notice" class="hint">{{ notice }}</div>

        <div v-if="tab==='opportunities'" class="panel comparison-workspace">
          <div class="panel-head comparison-head">
            <div>
              <h3>{{ t.opportunities }}</h3>
              <p class="panel-hint">{{ t.opportunitiesHint }}</p>
            </div>
            <div class="comparison-actions">
              <button v-if="!comparisonSources.length" class="btn btn--primary" :disabled="comparisonBusy" @click="configureSmartRyde">{{ t.connectSmartRyde }}</button>
              <button v-else class="btn btn--primary" :disabled="comparisonBusy" @click="createComparisonRun">{{ t.newAnalysis }}</button>
            </div>
          </div>

          <div v-if="comparisonSources.length" class="comparison-setup">
            <label class="pricing-field__label">{{ t.comparisonSource }}</label>
            <select v-model="selectedComparisonSourceId" class="input" @change="reloadComparisonRuns">
              <option v-for="source in comparisonSources" :key="source.id" :value="source.id">{{ source.name }}</option>
            </select>
            <div v-if="selectedComparisonSource" class="comparison-policy">
              <span><strong>{{ t.formula }}:</strong> {{ comparisonFormulaLabel(selectedComparisonSource) }}</span>
              <span><strong>{{ t.schedule }}:</strong> {{ comparisonScheduleLabel(selectedComparisonSource) }}</span>
              <span><strong>{{ t.status }}:</strong> {{ selectedComparisonSource.isActive ? t.active : t.paused }}</span>
            </div>
          </div>

          <div v-if="comparisonRuns.length" class="comparison-runs">
            <button
              v-for="run in comparisonRuns"
              :key="run.id"
              class="comparison-run-card"
              :class="{ 'comparison-run-card--active': run.id === selectedComparisonRunId }"
              @click="selectComparisonRun(run.id)"
            >
              <span class="status-pill" :class="`status-pill--${run.status}`">{{ comparisonStatusLabel(run.status) }}</span>
              <strong>{{ formatDateTime(run.serviceAt) }}</strong>
              <span>{{ run.processedCount }}/{{ run.routeCount }} · {{ t.green }}: {{ run.opportunitiesCount }} · {{ t.coverageShort }}: {{ run.coverageOpportunityCount || 0 }}</span>
            </button>
          </div>

          <div v-if="activeComparisonRun" class="comparison-current">
            <div class="comparison-kpis">
              <div class="mini-stat"><span>{{ t.runStatus }}</span><strong>{{ comparisonStatusLabel(activeComparisonRun.status) }}</strong></div>
              <div class="mini-stat"><span>{{ t.processed }}</span><strong>{{ activeComparisonRun.processedCount }}/{{ activeComparisonRun.routeCount }}</strong></div>
              <div class="mini-stat mini-stat--green"><span>{{ t.greenRoutes }}</span><strong>{{ activeComparisonRun.opportunitiesCount }}</strong></div>
              <div class="mini-stat"><span>{{ t.coverageOpportunities }}</span><strong>{{ activeComparisonRun.coverageOpportunityCount || 0 }}</strong></div>
              <div class="mini-stat"><span>{{ t.needsReview }}</span><strong>{{ activeComparisonRun.needsReviewCount }}</strong></div>
            </div>
            <div class="comparison-actions">
              <button v-if="['configured','needs_review','failed'].includes(activeComparisonRun.status)" class="btn btn--primary" :disabled="comparisonBusy" @click="executeComparisonRun">{{ activeComparisonRun.status === 'configured' ? t.launchAnalysis : t.resumeAnalysis }}</button>
              <button v-if="comparisonRows.length" class="btn" @click="downloadComparisonWorkbook">{{ t.downloadExcel }}</button>
            </div>
          </div>

          <div v-if="comparisonPlaceMappings.length" class="review-block">
            <h4>{{ t.reviewPlaces }}</h4>
            <p class="panel-hint">{{ t.reviewPlacesHint }}</p>
            <div
              v-for="mapping in comparisonPlaceMappings"
              :key="mapping.id"
              class="review-row"
              :class="{
                'review-row--processing': placeMappingIsBusy(mapping),
                'review-row--error': semanticMappingError(mapping)
              }"
              :aria-busy="placeMappingIsBusy(mapping) ? 'true' : 'false'"
            >
              <div class="review-row__main">
                <strong>{{ mapping.inputText }}</strong>
                <span v-if="placeMappingIsBusy(mapping)" class="review-row__progress" aria-live="polite">
                  {{ semanticMappingBusyId === mapping.id ? t.semanticProcessingHint : t.mappingApplyingHint }}
                  <i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>
                </span>
                <span v-else-if="semanticMappingError(mapping)" class="review-row__error" role="alert">{{ semanticMappingError(mapping) }}</span>
              </div>
              <div class="review-candidates">
                <button type="button" class="btn btn--small semantic-suggest-btn" :class="{ 'semantic-suggest-btn--processing': semanticMappingBusyId === mapping.id }" :disabled="placeMappingIsBusy(mapping)" @click="suggestPlaceMapping(mapping)">
                  <span v-if="semanticMappingBusyId === mapping.id" class="semantic-spinner" aria-hidden="true"></span>
                  <span>{{ semanticMappingBusyId === mapping.id ? t.semanticSearching : t.semanticSuggest }}</span>
                </button>
                <button v-for="candidate in mappingCandidates(mapping)" :key="candidate.id" type="button" class="btn btn--small mapping-choice-btn" :class="{ 'btn--recommended': semanticRecommendedId(mapping) === candidate.id, 'mapping-choice-btn--processing': placeMappingBusyId === mapping.id && placeMappingBusyCandidateId === candidate.id }" :disabled="placeMappingIsBusy(mapping)" @click="approvePlaceMapping(mapping, candidate)">
                  <span v-if="placeMappingBusyId === mapping.id && placeMappingBusyCandidateId === candidate.id" class="semantic-spinner" aria-hidden="true"></span>
                  <span>{{ placeMappingBusyId === mapping.id && placeMappingBusyCandidateId === candidate.id ? t.mappingApplying : candidate.label }}</span><span v-if="!(placeMappingBusyId === mapping.id && placeMappingBusyCandidateId === candidate.id) && semanticCandidateScore(mapping, candidate.id) !== null"> · {{ semanticCandidateScore(mapping, candidate.id) }}%</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="comparisonVehicleReviewRows.length" class="review-block">
            <h4>{{ t.reviewVehicles }}</h4>
            <p class="panel-hint">{{ t.reviewVehiclesHint }}</p>
            <div v-for="quote in comparisonVehicleReviewRows" :key="quote.id" class="review-row review-row--vehicle">
              <div><strong>{{ quote.externalVehicleName }}</strong><span>{{ quote.routeFrom }} → {{ quote.routeTo }}</span></div>
              <div>{{ t.mapTo }} <strong>{{ quote.requestedVehicleType }}</strong></div>
              <button class="btn btn--small btn--primary" @click="approveVehicleMapping(quote)">{{ t.approve }}</button>
            </div>
          </div>

          <div v-if="comparisonRows.length" class="pricing-list comparison-results">
            <div class="pricing-list__head pricing-list__head--opportunities">
              <div>{{ t.route }}</div>
              <div>{{ t.vehicleClass }}</div>
              <div>{{ t.riderraPrice }}</div>
              <div>{{ t.clientPrice }}</div>
              <div>{{ t.targetPrice }}</div>
              <div>{{ t.gap }}</div>
              <div>{{ t.status }}</div>
            </div>
            <div v-for="row in filteredComparisonRows" :key="row.id" class="pricing-row pricing-row--opportunities">
              <div class="route-cell"><strong>{{ row.routeFrom }} → {{ row.routeTo }}</strong><span>{{ row.cityPricing?.country || '' }} {{ row.cityPricing?.city || '' }}</span></div>
              <div>{{ row.requestedVehicleType }}</div>
              <div>{{ priceLabel(row.riderraSellPrice, row.riderraCurrency) }}</div>
              <div>{{ priceLabel(row.clientSellPrice, row.clientCurrency) }}</div>
              <div>{{ priceLabel(row.result?.targetPrice, row.riderraCurrency) }}</div>
              <div>{{ priceLabel(row.result?.opportunityGapAbs, row.riderraCurrency) }}</div>
              <div><span class="status-pill" :class="`status-pill--${row.result?.status || row.status}`">{{ comparisonStatusLabel(row.result?.status || row.status) }}</span></div>
            </div>
          </div>
          <div v-else-if="comparisonSources.length && !comparisonBusy" class="empty-state">{{ t.comparisonEmpty }}</div>
        </div>

        <div v-if="tab==='booking'" class="panel booking-workspace">
          <div class="panel-head comparison-head">
            <div>
              <h3>{{ t.bookingCalculation }}</h3>
              <p class="panel-hint">{{ t.bookingCalculationHint }}</p>
            </div>
            <div class="comparison-actions booking-head-actions">
              <button class="btn" :disabled="bookingCalculationBusy" @click="loadBookingCalculation(bookingPage)">{{ t.refresh }}</button>
              <button class="btn btn--primary" :disabled="bookingCalculationBusy || !bookingSource" @click="runBookingCheckNow">{{ t.bookingRunNow }}</button>
            </div>
          </div>

          <div v-if="bookingCalculation" class="booking-formula-card">
            <strong>{{ bookingCalculation.formula.portalVersion }}</strong>
            <span>{{ t.bookingFormulaCopy.replace('{bcom}', bookingCalculation.formula.bookingCommissionPercent).replace('{pmf}', bookingCalculation.formula.pmfPercent) }}</span>
            <span>{{ t.bookingApprovalNotice }}</span>
          </div>

          <div v-if="bookingCalculation" class="booking-view-switch" role="tablist" :aria-label="t.bookingCalculation">
            <button type="button" class="subtab" :class="{ 'subtab--active': bookingView === 'matrix' }" role="tab" :aria-selected="bookingView === 'matrix'" @click="setBookingView('matrix')">{{ t.bookingPriceMatrix }}</button>
            <button type="button" class="subtab" :class="{ 'subtab--active': bookingView === 'portal' }" role="tab" :aria-selected="bookingView === 'portal'" @click="setBookingView('portal')">{{ t.bookingPortalSetup }}</button>
          </div>

          <div v-if="bookingSource" class="booking-schedule-card">
            <div>
              <h4>{{ t.bookingScheduleTitle }}</h4>
              <p class="panel-hint">{{ t.bookingScheduleHint }}</p>
            </div>
            <label class="booking-toggle"><input v-model="bookingScheduleForm.priceWatchEnabled" type="checkbox" /> {{ t.bookingScheduleEnabled }}</label>
            <label class="pricing-field__label">{{ t.bookingFrequency }}
              <select v-model="bookingScheduleForm.frequency" class="input">
                <option value="daily">{{ t.bookingDaily }}</option>
                <option value="weekdays">{{ t.bookingWeekdays }}</option>
                <option value="weekly">{{ t.bookingWeekly }}</option>
              </select>
            </label>
            <label v-if="bookingScheduleForm.frequency==='weekly'" class="pricing-field__label">{{ t.bookingWeekday }}
              <select v-model.number="bookingScheduleForm.weekday" class="input">
                <option v-for="day in bookingWeekdays" :key="day.value" :value="day.value">{{ day.label }}</option>
              </select>
            </label>
            <label class="pricing-field__label">{{ t.bookingTime }}
              <input v-model="bookingScheduleForm.localTime" class="input" type="time" step="300" />
            </label>
            <button class="btn btn--primary" :disabled="bookingCalculationBusy" @click="saveBookingSchedule">{{ t.save }}</button>
          </div>

          <div v-if="bookingCalculation" class="comparison-kpis">
            <div class="mini-stat"><span>{{ t.bookingAirports }}</span><strong>{{ bookingAirportOptions.length }}</strong></div>
            <div class="mini-stat"><span>{{ t.bookingMatrices }}</span><strong>{{ bookingCalculation.vehicleMatrixCount }}</strong></div>
            <div class="mini-stat"><span>{{ t.bookingPointPrices }}</span><strong>{{ bookingCalculation.pointQuoteCount }}</strong></div>
            <div class="mini-stat"><span>{{ t.bookingLatestQuote }}</span><strong>{{ formatDateTime(bookingCalculation.latestQuotedAt) }}</strong></div>
          </div>

          <div v-if="bookingView === 'matrix' && bookingCalculationAirports.length" class="booking-airports">
            <section v-for="airport in bookingCalculationAirports" :key="airport.key" class="booking-airport-card">
              <div class="booking-airport-title"><strong>{{ airport.city || airport.country }}</strong><span>{{ airport.iata }} · {{ airport.airportName }}</span></div>
              <div class="booking-table-wrap">
                <table class="booking-price-matrix">
                  <thead><tr><th>{{ t.city }}</th><th>{{ t.bookingAirport }}</th><th>{{ t.bookingPoint }}</th><th v-for="vehicle in airport.vehicles" :key="vehicle.key">{{ vehicle.name }}</th></tr></thead>
                  <tbody>
                    <tr v-for="(point, pointIndex) in airport.points" :key="point.distanceKm">
                      <td v-if="pointIndex === 0" :rowspan="airport.points.length"><strong>{{ airport.city || airport.country }}</strong><small>{{ airport.country }}</small></td>
                      <td v-if="pointIndex === 0" :rowspan="airport.points.length"><strong>{{ airport.iata }}</strong><small>{{ airport.airportName }}</small></td>
                      <td><strong>{{ point.distanceKm }} {{ t.bookingKm }}</strong><small>{{ point.destinationAddress || t.bookingNoPrice }}</small></td>
                      <td v-for="vehicle in airport.vehicles" :key="vehicle.key" :class="{ 'booking-price-matrix__missing': !point.prices[vehicle.key]?.publicSellPrice }"><strong>{{ priceLabel(point.prices[vehicle.key]?.publicSellPrice || null, airport.currency) }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div v-else-if="bookingView === 'portal' && selectedBookingAirport" class="booking-portal-workspace">
            <div class="booking-portal-controls">
              <label class="pricing-field__label">{{ t.bookingChooseAirport }}
                <select v-model="selectedBookingAirportKey" class="input" @change="loadSelectedBookingAirport"><option v-for="airport in bookingAirportOptions" :key="airport.key" :value="airport.key">{{ airport.city || airport.airportName }} · {{ airport.iata }}</option></select>
              </label>
              <label class="pricing-field__label">{{ t.bookingGeniusContribution }}
                <select v-model.number="bookingGeniusPercent" class="input"><option :value="5">5% · Genius</option><option :value="0">{{ t.bookingWithoutGenius }}</option></select>
              </label>
              <button class="btn btn--primary" :disabled="bookingCalculationBusy" @click="loadBookingCalculation(bookingPage)">{{ t.bookingRecalculate }}</button>
              <div class="booking-genius-note"><strong>{{ t.bookingGeniusCustomer.replace('{total}', bookingCalculation.formula.totalGeniusPercent) }}</strong><span>{{ t.bookingGeniusOfficial }}</span></div>
            </div>

            <section v-for="vehicle in selectedBookingAirport.vehicles" :key="vehicle.key" class="booking-vehicle-plan">
              <div class="booking-vehicle-plan__head"><div><h4>{{ vehicle.name }}</h4><span>{{ selectedBookingAirport.city }} · {{ selectedBookingAirport.iata }}</span></div><strong>{{ selectedBookingAirport.currency }}</strong></div>
              <div class="booking-table-wrap">
                <table class="booking-portal-table">
                  <thead><tr><th>{{ t.bookingCalculationRow }}</th><th v-for="distance in bookingDistancePoints" :key="distance">{{ distance }} {{ t.bookingKm }}</th></tr></thead>
                  <tbody>
                    <tr><th>{{ t.bookingPublic }}</th><td v-for="point in selectedBookingAirport.points" :key="point.distanceKm">{{ priceLabel(point.prices[vehicle.key]?.publicSellPrice || null, selectedBookingAirport.currency) }}</td></tr>
                    <tr><th>{{ t.bookingPortalGross }}</th><td v-for="point in selectedBookingAirport.points" :key="point.distanceKm">{{ priceLabel(point.prices[vehicle.key]?.portalGrossPrice || null, selectedBookingAirport.currency) }}</td></tr>
                    <tr><th>{{ t.bookingAfterGenius }}</th><td v-for="point in selectedBookingAirport.points" :key="point.distanceKm">{{ priceLabel(point.prices[vehicle.key]?.geniusCustomerPrice || null, selectedBookingAirport.currency) }}</td></tr>
                    <tr><th>{{ t.bookingAfterBcom }}</th><td v-for="point in selectedBookingAirport.points" :key="point.distanceKm">{{ priceLabel(point.prices[vehicle.key]?.afterBookingCommission || null, selectedBookingAirport.currency) }}</td></tr>
                    <tr class="booking-portal-table__internal"><th>{{ t.bookingDriver }}</th><td v-for="point in selectedBookingAirport.points" :key="point.distanceKm">{{ priceLabel(point.prices[vehicle.key]?.driverTargetPrice || null, selectedBookingAirport.currency) }}</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="booking-portal-fields">
                <div><small>{{ t.bookingInitialPrice }}</small><strong>{{ priceLabel(vehicle.portalTariff.initialPrice || null, selectedBookingAirport.currency) }}</strong><span>{{ t.bookingIncludedDistance }}: {{ vehicle.portalTariff.includedDistanceKm }} {{ t.bookingKm }}</span></div>
                <div v-for="band in vehicle.portalTariff.bands" :key="band.number"><small>{{ t.bookingBand }} {{ band.number }}</small><strong>{{ priceLabel(band.pricePerKm || null, selectedBookingAirport.currency) }} / {{ t.bookingKm }}</strong><span>{{ band.toKm ? `${band.fromKm}–${band.toKm} ${t.bookingKm}` : `${t.bookingFrom} ${band.fromKm} ${t.bookingKm}` }}</span></div>
              </div>
              <p class="booking-plan-warning">{{ t.bookingPortalRounding }}</p>
            </section>
          </div>

          <div v-else-if="!bookingCalculationBusy" class="empty-state">{{ t.bookingEmpty }}</div>
          <div v-if="bookingView === 'matrix' && bookingCalculation && bookingCalculation.total > bookingCalculation.limit" class="booking-pagination">
            <button class="btn" :disabled="bookingPage <= 1 || bookingCalculationBusy" @click="loadBookingCalculation(bookingPage - 1)">←</button>
            <span>{{ bookingPage }} / {{ Math.ceil(bookingCalculation.total / bookingCalculation.limit) }}</span>
            <button class="btn" :disabled="bookingPage >= Math.ceil(bookingCalculation.total / bookingCalculation.limit) || bookingCalculationBusy" @click="loadBookingCalculation(bookingPage + 1)">→</button>
          </div>
        </div>

        <div v-if="tab==='base'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.base }}</h3>
              <p class="panel-hint">{{ t.baseHint }}</p>
            </div>
          </div>
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--sheet">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.price }}</div>
              <div>{{ t.currency }}</div>
              <div>{{ t.bestSupplier }}</div>
            </div>
            <div v-for="r in filteredBaseRows" :key="r.id" class="pricing-row pricing-row--sheet">
              <div>{{ sheetCountryLabel(r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeFrom, r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeTo, r) }}</div>
              <div>{{ r.vehicleType || '-' }}</div>
              <div>{{ paxLabel(r.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(r.fixedPrice) }}</strong></div>
              <div>
                <div>{{ r.currency || '-' }}</div>
                <div class="row-actions row-actions--inline">
                  <button class="btn btn--small btn--primary" @click="openBaseForm(r)">{{ t.edit }}</button>
                  <button class="btn btn--small btn--danger" @click="removeBaseRow(r)">{{ t.delete }}</button>
                </div>
              </div>
              <div class="supplier-cell">
                <strong>{{ r.bestSupplierCompany?.name || '—' }}</strong>
              </div>
            </div>
            <div v-if="!filteredBaseRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='counterparty'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.counterparty }}</h3>
              <p class="panel-hint">{{ t.counterpartyHint }}</p>
            </div>
          </div>
          <div class="pricebook-toolbar">
            <div class="filter-chips">
              <button class="filter-chip" :class="{ 'filter-chip--active': !selectedCounterparties.length }" @click="clearCounterparties">{{ t.allCounterparties }}</button>
              <button v-for="name in counterpartyOptions" :key="name" class="filter-chip" :class="{ 'filter-chip--active': selectedCounterparties.includes(name) }" @click="toggleCounterparty(name)">{{ name }}</button>
            </div>
          </div>
          <div v-if="externalCpRowsLoading" class="hint" aria-live="polite">{{ t.clientPricesLoading }}</div>
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--comparison" :style="counterpartyGridStyle">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.riderraPrice }}</div>
              <div>{{ t.currency }}</div>
              <div>{{ t.priceUpdatedAt }}</div>
              <div v-for="name in counterpartyComparisonColumns" :key="`head-${name}`">{{ name }}</div>
            </div>
            <div v-for="r in visibleCounterpartyComparisonRows" :key="r.key" class="pricing-row pricing-row--comparison" :style="counterpartyGridStyle">
              <div>{{ sheetCountryLabel(r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeFrom, r) }}</div>
              <div>{{ sheetPlaceLabel(r.routeTo, r) }}</div>
              <div>{{ r.vehicleType || '-' }}</div>
              <div>{{ r.maxPassengers || paxLabel(r.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(r.riderraPrice) }}</strong></div>
              <div>{{ r.currency || '-' }}</div>
              <div>{{ formatPriceDate(counterpartyRowUpdatedAt(r)) }}</div>
              <div v-for="name in counterpartyComparisonColumns" :key="`${r.key}-${name}`" class="price-cell price-cell--counterparty">
                <strong>{{ counterpartyPriceLabel(r, name) }}</strong>
                <small v-if="r.counterpartyPrices[name]?.updatedAt">{{ counterpartyPriceSourceLabel(r.counterpartyPrices[name]) }} · {{ formatPriceDate(r.counterpartyPrices[name].updatedAt) }}</small>
              </div>
            </div>
            <div v-if="!filteredCounterpartyComparisonRows.length" class="empty-state">{{ t.empty }}</div>
            <div v-else-if="counterpartyHiddenRowsCount > 0" class="pricing-list__more">
              <button class="btn" @click="showMoreCounterpartyRows">{{ t.showMore }} · {{ counterpartyHiddenRowsCount }}</button>
            </div>
          </div>
        </div>

        <div v-if="tab==='driver'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.driver }}</h3>
              <p class="panel-hint">{{ t.driverHint }}</p>
            </div>
          </div>
          <div class="pricebook-toolbar">
            <div class="filter-chips">
              <button class="filter-chip" :class="{ 'filter-chip--active': !selectedSuppliers.length }" @click="clearSuppliers">{{ t.allSuppliers }}</button>
              <button v-for="name in supplierOptions" :key="name" class="filter-chip" :class="{ 'filter-chip--active': selectedSuppliers.includes(name) }" @click="toggleSupplier(name)">{{ name }}</button>
            </div>
          </div>
          <div class="pricing-list pricing-list--sheet">
            <div class="pricing-list__head pricing-list__head--comparison" :style="supplierGridStyle">
              <div>{{ t.country }}</div>
              <div>{{ t.from }}</div>
              <div>{{ t.to }}</div>
              <div>{{ t.type }}</div>
              <div>{{ t.pax }}</div>
              <div>{{ t.riderraPrice }}</div>
              <div>{{ t.currency }}</div>
              <div v-for="name in supplierComparisonColumns" :key="`supplier-head-${name}`">{{ name }}</div>
            </div>
            <div v-for="d in visibleSupplierComparisonRows" :key="d.key" class="pricing-row pricing-row--comparison" :style="supplierGridStyle">
              <div>{{ sheetCountryLabel(d) }}</div>
              <div>{{ sheetPlaceLabel(d.routeFrom, d) }}</div>
              <div>{{ sheetPlaceLabel(d.routeTo, d) }}</div>
              <div>{{ d.vehicleType || '-' }}</div>
              <div>{{ paxLabel(d.vehicleType) }}</div>
              <div class="price-cell"><strong>{{ priceAmountLabel(d.riderraPrice) }}</strong></div>
              <div>{{ d.currency || '-' }}</div>
              <div v-for="name in supplierComparisonColumns" :key="`${d.key}-${name}`" class="price-cell price-cell--counterparty">
                <strong>{{ supplierPriceLabel(d, name) }}</strong>
              </div>
            </div>
            <div v-if="!filteredSupplierComparisonRows.length" class="empty-state">{{ t.empty }}</div>
            <div v-else-if="supplierHiddenRowsCount > 0" class="pricing-list__more">
              <button class="btn" @click="showMoreSupplierRows">{{ t.showMore }} · {{ supplierHiddenRowsCount }}</button>
            </div>
          </div>
        </div>

        <div v-if="tab==='conflicts'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.conflicts }}</h3>
              <p class="panel-hint">{{ t.conflictsHint }}</p>
            </div>
          </div>
          <div class="pricing-list">
            <div class="pricing-list__head pricing-list__head--conflicts">
              <div>{{ t.issue }}</div>
              <div>{{ t.routeScope }}</div>
              <div>{{ t.margin }}</div>
              <div>{{ t.managementSignal }}</div>
            </div>
            <div v-for="c in filteredConflictRows" :key="c.id" class="pricing-row pricing-row--conflicts">
              <div class="route-cell">
                <div class="route-cell__title">{{ conflictIssueLabel(c) }}</div>
                <div class="route-cell__sub">ID: {{ c.orderId || '-' }}</div>
              </div>
              <div class="route-cell">
                <div class="route-cell__title">{{ c.order ? `${c.order.fromPoint || '-'} → ${c.order.toPoint || '-'}` : '-' }}</div>
                <div class="route-cell__sub">{{ t.sale }}: {{ priceLabel(c.sellPrice) }} · {{ t.driverCost }}: {{ priceLabel(c.driverCost) }}</div>
              </div>
              <div class="price-cell">
                <strong>{{ priceLabel(c.marginAbs) }}</strong>
                <span class="muted">{{ percentLabel(c.marginPct) }}</span>
              </div>
              <div class="signal-cell">
                <div class="signal-cell__title">
                  <span class="severity-pill" :class="`severity-pill--${String(c.severity || '').toLowerCase()}`">{{ conflictSeverityLabel(c) }}</span>
                </div>
                <div class="signal-cell__copy">{{ conflictSignalCopy(c) }}</div>
              </div>
            </div>
            <div v-if="!filteredConflictRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>

        <div v-if="tab==='adjustments'" class="panel">
          <div class="panel-head">
            <div>
              <h3>{{ t.adjustments }}</h3>
              <p class="panel-hint">{{ t.adjustmentsHint }}</p>
            </div>
          </div>
          <div class="stats-grid">
            <div class="mini-stat">
              <span>{{ t.penaltyCount }}</span>
              <strong>{{ adjustmentTotals.adjustmentCount || 0 }}</strong>
            </div>
            <div class="mini-stat">
              <span>{{ t.penaltyAmount }}</span>
              <strong>{{ currencyTotalsLabel('penaltyAmount') }}</strong>
            </div>
            <div class="mini-stat">
              <span>{{ t.netProfit }}</span>
              <strong>{{ currencyTotalsLabel('netProfit') }}</strong>
            </div>
          </div>

          <div class="split-panels">
            <div class="pricing-list">
              <div class="pricing-list__head pricing-list__head--adjustment-stat">
                <div>{{ t.name }}</div>
                <div>{{ t.penaltyCount }}</div>
                <div>{{ t.penaltyAmount }}</div>
              </div>
              <div v-for="d in filteredAdjustmentDrivers" :key="d.key" class="pricing-row pricing-row--adjustment-stat">
                <div class="route-cell__title">{{ d.name }}</div>
                <div>{{ d.count }}</div>
                <div class="price-cell"><strong>{{ priceLabel(d.amount, d.currency) }}</strong></div>
              </div>
              <div v-if="!filteredAdjustmentDrivers.length" class="empty-state">{{ t.empty }}</div>
            </div>

            <div class="pricing-list">
              <div class="pricing-list__head pricing-list__head--adjustment-stat">
                <div>{{ t.counterpartyName }}</div>
                <div>{{ t.penaltyCount }}</div>
                <div>{{ t.penaltyAmount }}</div>
              </div>
              <div v-for="c in filteredAdjustmentCounterparties" :key="c.key" class="pricing-row pricing-row--adjustment-stat">
                <div class="route-cell__title">{{ c.name }}</div>
                <div>{{ c.count }}</div>
                <div class="price-cell"><strong>{{ priceLabel(c.amount, c.currency) }}</strong></div>
              </div>
              <div v-if="!filteredAdjustmentCounterparties.length" class="empty-state">{{ t.empty }}</div>
            </div>
          </div>

          <div class="pricing-list adjustments-recent">
            <div class="pricing-list__head pricing-list__head--adjustments">
              <div>{{ t.routeScope }}</div>
              <div>{{ t.counterpartyName }}</div>
              <div>{{ t.name }}</div>
              <div>{{ t.penaltyAmount }}</div>
            </div>
            <div v-for="row in filteredAdjustmentRows" :key="row.id" class="pricing-row pricing-row--adjustments">
              <div class="route-cell">
                <div class="route-cell__title">{{ row.order ? `${row.order.fromPoint || '-'} → ${row.order.toPoint || '-'}` : '-' }}</div>
                <div class="route-cell__sub">{{ row.reason || row.rawText || '-' }}</div>
              </div>
              <div>{{ row.customerCompany?.name || row.counterpartyName || '-' }}</div>
              <div>{{ row.driver?.name || row.driverNameRaw || '-' }}</div>
              <div class="price-cell">
                <strong>{{ priceLabel(row.amount, row.currency) }}</strong>
              </div>
            </div>
            <div v-if="!filteredAdjustmentRows.length" class="empty-state">{{ t.empty }}</div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="editingBase" class="modal-overlay" @click="closeBaseForm">
      <div class="modal" @click.stop>
        <div class="modal-head">
          <div>
            <h3>{{ editingBase.id ? t.editRow : t.addRow }}</h3>
            <p class="modal-subtitle">{{ t.baseFormHint }}</p>
          </div>
          <button class="modal-close" type="button" @click="closeBaseForm">×</button>
        </div>
        <div class="form-grid">
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.country }}</label>
            <input v-model="baseForm.country" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.from }}</label>
            <input v-model="baseForm.routeFrom" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.to }}</label>
            <input v-model="baseForm.routeTo" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.vehicleClass }} *</label>
            <input v-model="baseForm.vehicleType" class="input pricing-field__input" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.sale }} *</label>
            <input v-model="baseForm.fixedPrice" class="input pricing-field__input" type="number" step="0.01" min="0" />
          </div>
          <div class="pricing-field">
            <label class="pricing-field__label">{{ t.currency }} *</label>
            <input v-model="baseForm.currency" class="input pricing-field__input" />
          </div>
        </div>
        <div class="actions modal-actions">
          <button class="btn btn--primary" @click="saveBaseRow">{{ t.save }}</button>
          <button class="btn" @click="closeBaseForm">{{ t.cancel }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import adminTabs from '~/components/partials/adminTabs.vue'

export default {
  layout: 'admin',
  middleware: 'staff',
  components: { adminTabs },
  data: () => ({
    tab: 'base',
    q: '',
    baseRows: [],
    cpRows: [],
    externalCpRows: [],
    externalCpRowsLoaded: false,
    externalCpRowsLoading: false,
    conflictRows: [],
    driverRows: [],
    adjustmentSummary: null,
    comparisonSources: [],
    comparisonRuns: [],
    comparisonData: null,
    selectedComparisonSourceId: '',
    selectedComparisonRunId: '',
    comparisonBusy: false,
    semanticMappingBusyId: '',
    placeMappingBusyId: '',
    placeMappingBusyCandidateId: '',
    semanticMappingErrors: {},
    comparisonPollTimer: null,
    bookingCalculation: null,
    bookingCalculationBusy: false,
    bookingPage: 1,
    bookingView: 'matrix',
    bookingGeniusPercent: 5,
    selectedBookingAirportKey: '',
    bookingAirportOptions: [],
    bookingSearchTimer: null,
    bookingScheduleForm: {
      priceWatchEnabled: true,
      frequency: 'daily',
      weekday: 1,
      localTime: '08:00'
    },
    selectedCounterparties: [],
    selectedSuppliers: [],
    counterpartyVisibleLimit: 250,
    supplierVisibleLimit: 250,
    notice: '',
    editingBase: null,
    baseForm: {
      country: '',
      routeFrom: '',
      routeTo: '',
      vehicleType: '',
      fixedPrice: '',
      currency: 'EUR'
    }
  }),
  watch: {
    q () {
      this.resetCounterpartyVisibleLimit()
      this.resetSupplierVisibleLimit()
      if (this.tab === 'booking') {
        if (this.bookingSearchTimer) clearTimeout(this.bookingSearchTimer)
        this.bookingSearchTimer = setTimeout(() => this.loadBookingCalculation(1), 350)
      }
    },
    tab (value) {
      if (value === 'booking' && !this.bookingCalculation) this.loadBookingCalculation(1)
      if (value === 'counterparty' && !this.externalCpRowsLoaded) this.loadExternalClientPrices()
    },
    selectedCounterparties () {
      this.resetCounterpartyVisibleLimit()
    },
    selectedSuppliers () {
      this.resetSupplierVisibleLimit()
    }
  },
  computed: {
    t () {
      return this.$store.state.language === 'ru'
        ? {
            title: 'Прайс и контроль маржи',
            subtitle: 'Здесь команда видит не просто набор цен, а управленческую картину: где базовый прайс, где особые договорённости, где водительские ставки и где уже есть риск для маржи.',
            base: 'Базовый прайс',
            opportunities: 'Возможности',
            opportunitiesHint: 'Сравните активные маршруты Riderra с публичными ценами выбранной компании и найдите направления для партнёрского предложения.',
            bookingCalculation: 'Расчёт Booking',
            bookingCalculationHint: 'Сравните публичные цены по аэропортам и классам, затем получите готовые значения для дистанционных ставок в кабинете Booking.',
            bookingRunNow: 'Проверить цены сейчас',
            bookingFormulaCopy: 'Для кабинета: ориентир по розничной цене и Genius, без внутренней наценки. Отдельно для контроля: −{bcom}% BCOM, затем −{pmf}% до предельной цены водителя.',
            bookingApprovalNotice: 'Это отдельный рабочий расчёт Booking. Прайс 005 используется только как справочное сравнение и здесь не изменяется.',
            bookingPriceMatrix: 'Таблица цен',
            bookingPortalSetup: 'Настройка цен в Booking',
            bookingScheduleTitle: 'График проверки продажных цен',
            bookingScheduleHint: 'По расписанию Riderra повторно получает публичные цены Booking и формирует отдельный отчёт об отклонениях. Прайс 005 остаётся без изменений.',
            bookingScheduleEnabled: 'Проверка включена',
            bookingFrequency: 'Частота',
            bookingDaily: 'Каждый день',
            bookingWeekdays: 'По будням',
            bookingWeekly: 'Раз в неделю',
            bookingWeekday: 'День недели',
            bookingTime: 'Время по Москве',
            bookingAirports: 'Аэропортов',
            bookingMatrices: 'Классов в расчёте',
            bookingPointPrices: 'Заполненных точек',
            bookingLatestQuote: 'Последняя цена Booking',
            bookingLatestCheck: 'Последняя проверка Booking',
            bookingAirport: 'Аэропорт',
            bookingPoint: 'Контрольная точка',
            bookingKm: 'км',
            bookingBase: 'База водителя до 5 км',
            bookingPublic: 'Booking',
            bookingAfterBcom: 'После BCOM',
            bookingDriver: 'Водителю',
            bookingChooseAirport: 'Выберите аэропорт',
            bookingGeniusContribution: 'Вклад Riderra в Genius',
            bookingWithoutGenius: 'Без Genius',
            bookingGeniusCustomer: 'Итоговая скидка клиенту: {total}%',
            bookingGeniusOfficial: 'При включённом Genius Booking добавляет ещё 5 п.п. к нашим 5%. Расчёт показывает ставку до скидки, чтобы после неё остаться на целевой цене.',
            bookingRecalculate: 'Пересчитать',
            bookingCalculationRow: 'Расчёт',
            bookingPortalGross: 'Поставить в кабинете до Genius',
            bookingAfterGenius: 'Цена клиенту после Genius',
            bookingInitialPrice: 'Initial rate · Price',
            bookingIncludedDistance: 'Included distance',
            bookingBand: 'Band',
            bookingFrom: 'от',
            bookingPortalRounding: 'Значения округлены вниз до шага кабинета. Перед отправкой используйте «Check your rates» в Booking; Riderra ничего не меняет в аккаунте автоматически.',
            bookingNoPrice: 'Цена не найдена',
            bookingEmpty: 'Расчётных строк пока нет. Сначала загрузите или соберите цены Booking по контрольным точкам.',
            connectSmartRyde: 'Подключить SmartRyde',
            newAnalysis: 'Новый анализ',
            comparisonSource: 'Компания для сравнения',
            formula: 'Формула',
            schedule: 'Срез цены',
            status: 'Статус',
            active: 'Активен',
            paused: 'Приостановлен',
            green: 'зелёных',
            greenRoutes: 'Зелёные маршруты',
            coverageShort: 'нет у партнёра',
            coverageOpportunities: 'SmartRyde не продаёт',
            runStatus: 'Статус запуска',
            processed: 'Обработано',
            needsReview: 'Нужно проверить',
            launchAnalysis: 'Запустить сбор',
            resumeAnalysis: 'Продолжить после проверки',
            downloadExcel: 'Скачать Excel',
            reviewPlaces: 'Проверьте точки маршрута',
            reviewPlacesHint: 'SmartRyde нашёл несколько вариантов. Выберите точный адрес, прежде чем продолжить.',
            semanticSuggest: 'Подобрать по смыслу',
            semanticSearching: 'Разбираю маршрут…',
            semanticProcessingHint: 'Сверяю название с вариантами',
            semanticFailed: 'Не получилось разобрать маршрут. Попробуйте ещё раз.',
            mappingApplying: 'Применяю…',
            mappingApplyingHint: 'Сохраняю выбранную точку',
            mappingApplyFailed: 'Не получилось применить вариант. Попробуйте ещё раз.',
            reviewVehicles: 'Проверьте классы автомобилей',
            reviewVehiclesHint: 'Подтвердите, как внешний класс соответствует классу в прайсе Riderra.',
            mapTo: 'сопоставить с',
            approve: 'Подтвердить',
            clientPrice: 'Цена компании',
            targetPrice: 'Цена компании после комиссии',
            gap: 'Запас',
            comparisonEmpty: 'Создайте анализ, проверьте параметры и вручную запустите сбор цен.',
            counterparty: 'Прайсы клиентов',
            driver: 'Прайсы исполнителей',
            allCounterparties: 'Все клиенты',
            allSuppliers: 'Все исполнители',
            conflicts: 'Риски',
            adjustments: 'Штрафы',
            refresh: 'Обновить',
            addRow: 'Добавить строку',
            editRow: 'Редактировать строку',
            edit: 'Изменить',
            delete: 'Удалить',
            showMore: 'Показать ещё',
            etaTemplate: 'Шаблон для ETA',
            recalc: 'Пересчитать риски',
            city: 'Город',
            route: 'Маршрут',
            routeScope: 'Маршрут и покрытие',
            from: 'Откуда',
            to: 'Куда',
            type: 'Type',
            pax: 'Pax',
            price: 'Price',
            riderraPrice: 'Price (Riderra)',
            vehicleClass: 'Класс авто',
            sale: 'Цена',
            currency: 'Валюта',
            priceUpdatedAt: 'Цена обновлена',
            publicSnapshot: 'Сайт',
            agreedPrice: 'Согласовано',
            bestSupplier: 'Лучший поставщик',
            counterpartyName: 'Контрагент',
            name: 'Водитель',
            country: 'Страна',
            coverage: 'Покрытие',
            issue: 'Проблема',
            driverCost: 'Цена водителя',
            margin: 'Маржа',
            criticalRisks: 'Критичные риски',
            warningRisks: 'Предупреждения',
            penaltyCount: 'Количество штрафов',
            penaltyAmount: 'Сумма штрафов',
            netProfit: 'Профит после штрафов',
            managementSignal: 'Следующий шаг',
            loadedRows: 'Загружено строк базового прайса',
            save: 'Сохранить',
            cancel: 'Отмена',
            empty: 'По текущему фильтру данных пока нет.',
            baseHint: 'Главный источник истины по продажной цене Riderra. Именно отсюда должна браться финальная цена, если нет специально согласованного исключения.',
            counterpartyHint: 'Согласованные цены и последние публичные цены, собранные с сайтов клиентов. Публичные снимки показываются для анализа и не меняют договорной прайс.',
            clientPricesLoading: 'Загружаю сохранённые публичные прайсы клиентов…',
            driverHint: 'Актуальный прайс-лист выбранного исполнителя: маршруты, классы авто, себестоимость и источник строки.',
            conflictsHint: 'Открытые ситуации, где цена водителя уже конфликтует с продажной ценой или маржа стала опасной.',
            adjustmentsHint: 'Штрафы и удержания из заказов. Здесь видно, на каких водителей и клиентов приходится больше всего потерь, и как это меняет реальный профит.',
            baseFormHint: 'Добавляем или редактируем строку основного прайса Riderra. Это опорная цена для команды.',
            issueDriverGtSell: 'Цена исполнителя выше продажи',
            issueLowMargin: 'Низкая маржа',
            severityCritical: 'Критично',
            severityWarning: 'Внимание'
          }
        : {
            title: 'Pricing & Margin Control',
            subtitle: 'This screen shows more than price rows. It gives the team a management view of base pricing, special agreements, driver economics, and margin risk.',
            base: 'Base pricing',
            opportunities: 'Opportunities',
            opportunitiesHint: 'Compare active Riderra routes with public prices from a selected company and find routes for a partnership offer.',
            bookingCalculation: 'Booking calculation',
            bookingCalculationHint: 'Compare public prices by airport and vehicle class, then get ready-to-enter distance rates for the Booking portal.',
            bookingRunNow: 'Check Booking prices now',
            bookingFormulaCopy: 'Portal setup uses the retail target and Genius without internal markup. Control values separately deduct {bcom}% BCOM and then {pmf}% to the driver target.',
            bookingApprovalNotice: 'This is a separate Booking working calculation. The 005 price book is reference-only and cannot be changed here.',
            bookingPriceMatrix: 'Price table',
            bookingPortalSetup: 'Set Booking rates',
            bookingScheduleTitle: 'Selling-price monitoring schedule',
            bookingScheduleHint: 'Riderra fetches Booking public prices and creates a separate variance report. The 005 price book remains unchanged.',
            bookingScheduleEnabled: 'Monitoring enabled',
            bookingFrequency: 'Frequency',
            bookingDaily: 'Every day',
            bookingWeekdays: 'Weekdays',
            bookingWeekly: 'Weekly',
            bookingWeekday: 'Weekday',
            bookingTime: 'Moscow time',
            bookingAirports: 'Airports',
            bookingMatrices: 'Vehicle calculations',
            bookingPointPrices: 'Filled benchmark points',
            bookingLatestQuote: 'Latest Booking quote',
            bookingLatestCheck: 'Latest Booking check',
            bookingAirport: 'Airport',
            bookingPoint: 'Benchmark point',
            bookingKm: 'km',
            bookingBase: 'Supplier base up to 5 km',
            bookingPublic: 'Booking',
            bookingAfterBcom: 'After BCOM',
            bookingDriver: 'Supplier',
            bookingChooseAirport: 'Choose airport',
            bookingGeniusContribution: 'Riderra Genius contribution',
            bookingWithoutGenius: 'Without Genius',
            bookingGeniusCustomer: 'Total traveller discount: {total}%',
            bookingGeniusOfficial: 'With Genius enabled, Booking adds another 5 percentage points to our 5%. The calculation shows the pre-discount rate that lands on the target customer price.',
            bookingRecalculate: 'Recalculate',
            bookingCalculationRow: 'Calculation',
            bookingPortalGross: 'Enter in portal before Genius',
            bookingAfterGenius: 'Customer price after Genius',
            bookingInitialPrice: 'Initial rate · Price',
            bookingIncludedDistance: 'Included distance',
            bookingBand: 'Band',
            bookingFrom: 'from',
            bookingPortalRounding: 'Values are rounded down to portal precision. Use “Check your rates” in Booking before submitting; Riderra never changes the account automatically.',
            bookingNoPrice: 'No price found',
            bookingEmpty: 'No calculated rows yet. Import or collect Booking benchmark-point prices first.',
            connectSmartRyde: 'Connect SmartRyde',
            newAnalysis: 'New analysis',
            comparisonSource: 'Comparison company',
            formula: 'Formula',
            schedule: 'Price snapshot',
            status: 'Status',
            active: 'Active',
            paused: 'Paused',
            green: 'green',
            greenRoutes: 'Green routes',
            coverageShort: 'partner gaps',
            coverageOpportunities: 'Not sold by partner',
            runStatus: 'Run status',
            processed: 'Processed',
            needsReview: 'Needs review',
            launchAnalysis: 'Start collection',
            resumeAnalysis: 'Resume after review',
            downloadExcel: 'Download Excel',
            reviewPlaces: 'Review route places',
            reviewPlacesHint: 'The provider returned several candidates. Select the exact place before continuing.',
            semanticSuggest: 'Rank semantically',
            semanticSearching: 'Matching route…',
            semanticProcessingHint: 'Comparing the name with available places',
            semanticFailed: 'Could not match this route. Please try again.',
            mappingApplying: 'Applying…',
            mappingApplyingHint: 'Saving the selected place',
            mappingApplyFailed: 'Could not apply this option. Please try again.',
            reviewVehicles: 'Review vehicle classes',
            reviewVehiclesHint: 'Confirm how the external vehicle class maps to the Riderra price class.',
            mapTo: 'map to',
            approve: 'Approve',
            clientPrice: 'Company price',
            targetPrice: 'Company price after commission',
            gap: 'Gap',
            comparisonEmpty: 'Create an analysis, review its parameters, and manually start price collection.',
            counterparty: 'Customer prices',
            driver: 'Supplier prices',
            allCounterparties: 'All customers',
            allSuppliers: 'All suppliers',
            conflicts: 'Risks',
            adjustments: 'Penalties',
            refresh: 'Refresh',
            addRow: 'Add row',
            editRow: 'Edit row',
            edit: 'Edit',
            delete: 'Delete',
            showMore: 'Show more',
            etaTemplate: 'ETA Template',
            recalc: 'Recalculate risks',
            city: 'City',
            route: 'Route',
            routeScope: 'Route and scope',
            from: 'From',
            to: 'To',
            type: 'Type',
            pax: 'Pax',
            price: 'Price',
            riderraPrice: 'Price (Riderra)',
            vehicleClass: 'Vehicle class',
            sale: 'Price',
            currency: 'Currency',
            priceUpdatedAt: 'Price updated',
            publicSnapshot: 'Website',
            agreedPrice: 'Agreed',
            bestSupplier: 'Best supplier',
            counterpartyName: 'Counterparty',
            name: 'Driver',
            country: 'Country',
            coverage: 'Coverage',
            issue: 'Issue',
            driverCost: 'Driver cost',
            margin: 'Margin',
            criticalRisks: 'Critical risks',
            warningRisks: 'Warnings',
            penaltyCount: 'Penalty count',
            penaltyAmount: 'Penalty amount',
            netProfit: 'Profit after penalties',
            managementSignal: 'Next step',
            loadedRows: 'Loaded base pricing rows',
            save: 'Save',
            cancel: 'Cancel',
            empty: 'No data for the current filter yet.',
            baseHint: 'The main source of truth for Riderra selling price. The team should fall back to this unless there is an explicit exception.',
            counterpartyHint: 'Agreed prices plus the latest public prices collected from client websites. Public snapshots are for analysis and do not alter contractual pricing.',
            clientPricesLoading: 'Loading saved public client prices…',
            driverHint: 'Current price book for the selected supplier: routes, vehicle classes, supplier cost, and row source.',
            conflictsHint: 'Open situations where driver cost already conflicts with the sell price or margin became risky.',
            adjustmentsHint: 'Penalties and deductions from orders. This shows which drivers and clients create the largest loss and how real profit changes.',
            baseFormHint: 'Add or edit a base pricing row. This is the anchor sale price for the team.',
            issueDriverGtSell: 'Supplier price is above sell price',
            issueLowMargin: 'Low margin',
            severityCritical: 'Critical',
            severityWarning: 'Warning'
          }
    },
    searchPlaceholder () {
      if (this.tab === 'opportunities') return this.$store.state.language === 'ru' ? 'Поиск по маршруту, классу или статусу' : 'Search by route, class, or status'
      if (this.tab === 'booking') return this.$store.state.language === 'ru' ? 'Поиск по стране, городу, IATA или классу' : 'Search by country, city, IATA, or class'
      if (this.tab === 'base') return this.$store.state.language === 'ru' ? 'Поиск по стране, маршруту или классу авто' : 'Search by country, route, or vehicle class'
      if (this.tab === 'counterparty') return this.$store.state.language === 'ru' ? 'Поиск по клиенту, городу или маршруту' : 'Search by customer, city, or route'
      if (this.tab === 'driver') return this.$store.state.language === 'ru' ? 'Поиск по исполнителю, стране или городу' : 'Search by supplier, country, or city'
      if (this.tab === 'adjustments') return this.$store.state.language === 'ru' ? 'Поиск по водителю, клиенту или маршруту' : 'Search by driver, client, or route'
      return this.$store.state.language === 'ru' ? 'Поиск по проблеме, ID заказа или маршруту' : 'Search by issue, order ID, or route'
    },
    overviewCards () {
      const specialDeals = this.cpRows.filter((row) => row.isActive).length
      const driverWithEconomics = this.driverPriceRows.length
      const penalties = this.adjustmentTotals.adjustmentCount || 0
      const criticalRisks = this.conflictRows.filter((row) => String(row.severity || '').toLowerCase() === 'critical').length
      const warningRisks = this.conflictRows.filter((row) => String(row.severity || '').toLowerCase() === 'warning').length
      return [
        { key: 'base', value: this.baseRows.length, label: this.t.base, hint: this.t.baseHint, tone: 'neutral' },
        { key: 'counterparty', value: specialDeals, label: this.t.counterparty, hint: this.t.counterpartyHint, tone: specialDeals ? 'info' : 'neutral' },
        { key: 'driver', value: driverWithEconomics, label: this.t.driver, hint: this.t.driverHint, tone: driverWithEconomics ? 'ok' : 'neutral' },
        { key: 'conflicts', value: `${criticalRisks}/${warningRisks}`, label: this.t.conflicts, hint: `${this.t.criticalRisks}: ${criticalRisks} · ${this.t.warningRisks}: ${warningRisks}`, tone: criticalRisks ? 'critical' : (warningRisks ? 'warn' : 'neutral') },
        { key: 'penalties', value: penalties, label: this.t.adjustments, hint: this.t.adjustmentsHint, tone: penalties ? 'critical' : 'neutral' }
      ]
    },
    adjustmentTotals () {
      return this.adjustmentSummary?.totals || {}
    },
    selectedComparisonSource () {
      return this.comparisonSources.find((source) => source.id === this.selectedComparisonSourceId) || null
    },
    bookingSource () {
      return this.comparisonSources.find((source) => source.adapterKey === 'booking') || this.bookingCalculation?.source || null
    },
    bookingCalculationRows () {
      return this.bookingCalculation?.rows || []
    },
    bookingCalculationAirports () {
      return this.bookingCalculation?.airports || []
    },
    selectedBookingAirport () {
      return this.bookingCalculationAirports.find((airport) => airport.key === this.selectedBookingAirportKey) || this.bookingCalculationAirports[0] || null
    },
    bookingDistancePoints () {
      return this.bookingCalculation?.formula?.distancePoints || [5, 10, 20, 40, 60]
    },
    bookingWeekdays () {
      const ru = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
      const en = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      return (this.$store.state.language === 'ru' ? ru : en).map((label, index) => ({ value: index + 1, label }))
    },
    activeComparisonRun () {
      return this.comparisonData?.run || this.comparisonRuns.find((run) => run.id === this.selectedComparisonRunId) || null
    },
    comparisonRows () {
      return (this.comparisonData?.rows || []).filter((row) => row.status !== 'ignored')
    },
    comparisonPlaceMappings () {
      return this.comparisonData?.placeMappings || []
    },
    comparisonVehicleReviewRows () {
      const seen = new Set()
      return this.comparisonRows.filter((row) => {
        if (row.status !== 'needs_review' || !row.externalVehicleName || row.externalVehicleKey.startsWith('_')) return false
        const key = `${row.externalVehicleKey}|${row.requestedVehicleType}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    },
    filteredComparisonRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.comparisonRows
      return this.comparisonRows.filter((row) => `${row.routeFrom} ${row.routeTo} ${row.requestedVehicleType} ${row.result?.status || row.status}`.toLowerCase().includes(q))
    },
    filteredBaseRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.baseRows
      return this.baseRows.filter((row) => `${row.country || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''} ${row.bestSupplierCompany?.name || ''}`.toLowerCase().includes(q))
    },
    filteredCpRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.cpRows
      return this.cpRows.filter((row) => `${row.counterpartyName || ''} ${row.city || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''}`.toLowerCase().includes(q))
    },
    counterpartyOptions () {
      return Array.from(new Set([...this.cpRows, ...this.externalCpRows]
        .filter((row) => row.isActive !== false)
        .map((row) => row.customerCompany?.name || row.counterpartyName)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    },
    supplierOptions () {
      return Array.from(new Set(this.driverPriceRows
        .map((row) => row.supplierName || row.driverName)
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
    },
    counterpartyPricebookRows () {
      return [...this.cpRows, ...this.externalCpRows]
        .filter((row) => row.isActive !== false)
        .map((row) => ({
          ...row,
          pricebookOwner: row.customerCompany?.name || row.counterpartyName,
          pricebookPrice: row.sellPrice,
          pricebookUpdatedAt: row.capturedAt || row.updatedAt || row.createdAt || null
        }))
    },
    counterpartyComparisonColumns () {
      return this.selectedCounterparties.length ? this.selectedCounterparties : this.counterpartyOptions
    },
    counterpartyGridStyle () {
      const priceColumns = this.counterpartyComparisonColumns.map(() => 'minmax(120px, .65fr)').join(' ')
      return {
        gridTemplateColumns: `minmax(130px, .8fr) minmax(220px, 1.35fr) minmax(220px, 1.35fr) minmax(170px, 1fr) minmax(64px, .45fr) minmax(120px, .7fr) minmax(92px, .55fr) minmax(112px, .65fr) ${priceColumns}`.trim(),
        minWidth: `${1180 + (this.counterpartyComparisonColumns.length * 136)}px`
      }
    },
    counterpartyComparisonRows () {
      const rows = new Map()
      const ensure = (row = {}) => {
        const key = this.pricebookRouteKey(row)
        if (!rows.has(key)) {
          rows.set(key, {
            key,
            country: row.country || '',
            city: row.city || '',
            routeFrom: row.routeFrom || row.fromPoint || '',
            routeTo: row.routeTo || row.toPoint || '',
            vehicleType: row.vehicleType || '',
            maxPassengers: row.maxPassengers || null,
            riderraPrice: row.fixedPrice ?? null,
            currency: row.currency || 'EUR',
            counterpartyPrices: {},
            latestUpdatedAt: null
          })
        }
        return rows.get(key)
      }

      this.baseRows.forEach((row) => {
        const item = ensure(row)
        item.country = row.country || item.country
        item.city = row.city || item.city
        item.routeFrom = row.routeFrom || item.routeFrom
        item.routeTo = row.routeTo || item.routeTo
        item.vehicleType = row.vehicleType || item.vehicleType
        item.riderraPrice = row.fixedPrice ?? item.riderraPrice
        item.currency = row.currency || item.currency
      })

      this.counterpartyPricebookRows.forEach((row) => {
        const owner = row.pricebookOwner
        if (!owner) return
        const item = ensure(row)
        if (!item.country) item.country = row.country || this.countryByPlace(row.city) || ''
        if (!item.city) item.city = row.city || ''
        if (!item.routeFrom) item.routeFrom = row.routeFrom || ''
        if (!item.routeTo) item.routeTo = row.routeTo || ''
        if (!item.vehicleType) item.vehicleType = row.vehicleType || ''
        if (!item.maxPassengers) item.maxPassengers = row.maxPassengers || null
        if (!item.currency) item.currency = row.currency || 'EUR'
        if (!item.counterpartyPrices[owner]) {
          item.counterpartyPrices[owner] = {
            price: row.pricebookPrice,
            currency: row.currency || item.currency || 'EUR',
            updatedAt: row.pricebookUpdatedAt,
            sourceType: row.sourceType || 'counterparty_rule',
            sourceLabel: row.sourceLabel || ''
          }
          if (row.pricebookUpdatedAt && (!item.latestUpdatedAt || new Date(row.pricebookUpdatedAt) > new Date(item.latestUpdatedAt))) item.latestUpdatedAt = row.pricebookUpdatedAt
        }
      })

      return Array.from(rows.values())
        .sort((a, b) => this.pricebookSortLabel(a).localeCompare(this.pricebookSortLabel(b)))
    },
    filteredCounterpartyComparisonRows () {
      const owners = this.selectedCounterparties
      const q = this.q.trim().toLowerCase()
      return this.counterpartyComparisonRows.filter((row) => {
        if (owners.length && !owners.some((owner) => row.counterpartyPrices[owner])) return false
        if (!q) return true
        return [
          this.sheetCountryLabel(row),
          this.sheetPlaceLabel(row.routeFrom, row),
          this.sheetPlaceLabel(row.routeTo, row),
          row.vehicleType,
          row.currency,
          ...Object.entries(row.counterpartyPrices).flatMap(([owner, price]) => [owner, price.price, price.currency])
        ].join(' ').toLowerCase().includes(q)
      })
    },
    visibleCounterpartyComparisonRows () {
      return this.filteredCounterpartyComparisonRows.slice(0, this.counterpartyVisibleLimit)
    },
    counterpartyHiddenRowsCount () {
      return Math.max(0, this.filteredCounterpartyComparisonRows.length - this.visibleCounterpartyComparisonRows.length)
    },
    filteredCounterpartyPricebookRows () {
      const owners = this.selectedCounterparties
      const q = this.q.trim().toLowerCase()
      return this.counterpartyPricebookRows.filter((row) => {
        if (owners.length && !owners.includes(row.pricebookOwner)) return false
        if (!q) return true
        return `${row.pricebookOwner || ''} ${row.city || ''} ${row.country || ''} ${row.routeFrom || ''} ${row.routeTo || ''} ${row.vehicleType || ''}`.toLowerCase().includes(q)
      })
    },
    filteredDriverRows () {
      const owners = this.selectedSuppliers
      const q = this.q.trim().toLowerCase()
      return this.driverPriceRows.filter((row) => {
        const rowOwner = row.supplierName || row.driverName
        if (owners.length && !owners.includes(rowOwner)) return false
        if (!q) return true
        return `${rowOwner || ''} ${row.country || ''} ${row.city || ''} ${row.fromPoint || ''} ${row.toPoint || ''} ${row.vehicleType || ''} ${row.sourceLabel || ''}`.toLowerCase().includes(q)
      })
    },
    supplierComparisonColumns () {
      return this.selectedSuppliers.length ? this.selectedSuppliers : this.supplierOptions
    },
    supplierGridStyle () {
      const priceColumns = this.supplierComparisonColumns.map(() => 'minmax(120px, .65fr)').join(' ')
      return {
        gridTemplateColumns: `minmax(130px, .8fr) minmax(220px, 1.35fr) minmax(220px, 1.35fr) minmax(170px, 1fr) minmax(64px, .45fr) minmax(120px, .7fr) minmax(92px, .55fr) ${priceColumns}`.trim(),
        minWidth: `${1060 + (this.supplierComparisonColumns.length * 136)}px`
      }
    },
    supplierComparisonRows () {
      const rows = new Map()
      const ensure = (row = {}) => {
        const key = this.pricebookRouteKey(row)
        if (!rows.has(key)) {
          rows.set(key, {
            key,
            country: row.country || '',
            city: row.city || '',
            routeFrom: row.routeFrom || row.fromPoint || '',
            routeTo: row.routeTo || row.toPoint || '',
            vehicleType: row.vehicleType || '',
            riderraPrice: row.fixedPrice ?? null,
            currency: row.currency || 'EUR',
            supplierPrices: {}
          })
        }
        return rows.get(key)
      }

      this.baseRows.forEach((row) => {
        const item = ensure(row)
        item.country = row.country || item.country
        item.city = row.city || item.city
        item.routeFrom = row.routeFrom || item.routeFrom
        item.routeTo = row.routeTo || item.routeTo
        item.vehicleType = row.vehicleType || item.vehicleType
        item.riderraPrice = row.fixedPrice ?? item.riderraPrice
        item.currency = row.currency || item.currency
      })

      this.driverPriceRows.forEach((row) => {
        const owner = row.supplierName || row.driverName
        if (!owner) return
        const item = ensure(row)
        if (!item.country) item.country = row.country || this.countryByPlace(row.city) || ''
        if (!item.city) item.city = row.city || ''
        if (!item.routeFrom) item.routeFrom = row.routeFrom || row.fromPoint || ''
        if (!item.routeTo) item.routeTo = row.routeTo || row.toPoint || ''
        if (!item.vehicleType) item.vehicleType = row.vehicleType || ''
        if (!item.currency) item.currency = row.currency || 'EUR'
        if (!item.supplierPrices[owner]) {
          item.supplierPrices[owner] = {
            price: row.driverPrice,
            currency: row.currency || item.currency || 'EUR'
          }
        }
      })

      return Array.from(rows.values())
        .sort((a, b) => this.pricebookSortLabel(a).localeCompare(this.pricebookSortLabel(b)))
    },
    filteredSupplierComparisonRows () {
      const owners = this.selectedSuppliers
      const q = this.q.trim().toLowerCase()
      return this.supplierComparisonRows.filter((row) => {
        if (owners.length && !owners.some((owner) => row.supplierPrices[owner])) return false
        if (!q) return true
        return [
          this.sheetCountryLabel(row),
          this.sheetPlaceLabel(row.routeFrom, row),
          this.sheetPlaceLabel(row.routeTo, row),
          row.vehicleType,
          row.currency,
          ...Object.entries(row.supplierPrices).flatMap(([owner, price]) => [owner, price.price, price.currency])
        ].join(' ').toLowerCase().includes(q)
      })
    },
    visibleSupplierComparisonRows () {
      return this.filteredSupplierComparisonRows.slice(0, this.supplierVisibleLimit)
    },
    supplierHiddenRowsCount () {
      return Math.max(0, this.filteredSupplierComparisonRows.length - this.visibleSupplierComparisonRows.length)
    },
    driverPriceRows () {
      return this.driverRows.flatMap((driver) => {
        const coverage = [driver.country, driver.city].filter(Boolean).join(' · ')
        return (driver.routes || []).map((route) => ({
          ...route,
          driverName: driver.name,
          country: driver.country,
          city: driver.city,
          coverage,
          supplierName: driver.supplierCompany?.name || driver.supplierContact?.fullName || ''
        }))
      })
    },
    filteredConflictRows () {
      const q = this.q.trim().toLowerCase()
      if (!q) return this.conflictRows
      return this.conflictRows.filter((row) => {
        const route = row.order ? `${row.order.fromPoint || ''} ${row.order.toPoint || ''}` : ''
        return `${row.issueType || ''} ${row.orderId || ''} ${route}`.toLowerCase().includes(q)
      })
    },
    filteredAdjustmentRows () {
      const rows = this.adjustmentSummary?.recent || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => {
        const route = row.order ? `${row.order.fromPoint || ''} ${row.order.toPoint || ''}` : ''
        return `${row.driver?.name || ''} ${row.driverNameRaw || ''} ${row.customerCompany?.name || ''} ${row.counterpartyName || ''} ${route} ${row.reason || ''}`.toLowerCase().includes(q)
      })
    },
    filteredAdjustmentDrivers () {
      const rows = this.adjustmentSummary?.byDriver || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => `${row.name || ''}`.toLowerCase().includes(q))
    },
    filteredAdjustmentCounterparties () {
      const rows = this.adjustmentSummary?.byCounterparty || []
      const q = this.q.trim().toLowerCase()
      if (!q) return rows
      return rows.filter((row) => `${row.name || ''}`.toLowerCase().includes(q))
    }
  },
  mounted () { this.reloadAll() },
  beforeDestroy () {
    if (this.comparisonPollTimer) clearTimeout(this.comparisonPollTimer)
    if (this.bookingSearchTimer) clearTimeout(this.bookingSearchTimer)
  },
  methods: {
    headers () {
      const token = localStorage.getItem('authToken')
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
    async fetchJson (url, options = {}) {
      const response = await fetch(url, { headers: this.headers(), ...options })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`)
      }
      return body
    },
    comparisonFormulaLabel (source) {
      const policy = source?.pricingPolicy || {}
      if (policy.type === 'client_commission') return `${source?.name || 'Company'} × ${(1 - (Number(policy.commissionPercent || 0) / 100)).toFixed(2)} (${policy.commissionPercent}% комиссия)`
      if (policy.type === 'percentage_discount') return `Riderra × ${(1 - (Number(policy.discountPercent || 0) / 100)).toFixed(2)} (${policy.discountPercent}% ниже)`
      if (policy.type === 'sequential_deductions') return (policy.deductions || []).map((value) => `−${value}%`).join(' → ')
      return source?.formulaVersion || '-'
    },
    comparisonScheduleLabel (source) {
      const schedule = source?.schedule || {}
      return this.$store.state.language === 'ru'
        ? `среда, ${schedule.localTime || '12:00'}, не раньше чем через ${schedule.minLeadDays || 7} дней`
        : `Wednesday, ${schedule.localTime || '12:00'}, at least ${schedule.minLeadDays || 7} days ahead`
    },
    comparisonStatusLabel (status) {
      const labelsRu = { draft: 'Черновик', configured: 'Готов к запуску', running: 'Сбор цен', needs_review: 'Нужна проверка', ready: 'Готово', failed: 'Ошибка', opportunity: 'Зелёный', not_opportunity: 'Нет преимущества', no_quote: 'SmartRyde не продаёт', compared: 'Сравнено' }
      const labelsEn = { draft: 'Draft', configured: 'Ready to start', running: 'Collecting', needs_review: 'Needs review', ready: 'Ready', failed: 'Failed', opportunity: 'Green', not_opportunity: 'No advantage', no_quote: 'Partner does not sell', compared: 'Compared' }
      return (this.$store.state.language === 'ru' ? labelsRu : labelsEn)[status] || status || '-'
    },
    formatDateTime (value) {
      if (!value) return '-'
      return new Date(value).toLocaleString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    },
    formatPriceDate (value) {
      if (!value) return '-'
      return new Date(value).toLocaleDateString(this.$store.state.language === 'ru' ? 'ru-RU' : 'en-GB', { dateStyle: 'medium' })
    },
    counterpartyRowUpdatedAt (row) {
      const dates = this.counterpartyComparisonColumns
        .map((owner) => row.counterpartyPrices?.[owner]?.updatedAt)
        .filter(Boolean)
        .sort((left, right) => new Date(right) - new Date(left))
      return dates[0] || row.latestUpdatedAt || null
    },
    counterpartyPriceSourceLabel (price) {
      return price?.sourceType === 'external_snapshot' ? this.t.publicSnapshot : this.t.agreedPrice
    },
    mappingCandidates (mapping) {
      try { return JSON.parse(mapping.candidatesJson || '[]') } catch (_) { return [] }
    },
    semanticSuggestions (mapping) {
      try { return JSON.parse(mapping.semanticSuggestionsJson || '{}') } catch (_) { return {} }
    },
    semanticRecommendedId (mapping) {
      return this.semanticSuggestions(mapping).recommended?.id || ''
    },
    semanticCandidateScore (mapping, candidateId) {
      const row = (this.semanticSuggestions(mapping).candidates || []).find((candidate) => candidate.id === candidateId)
      return row ? Math.round(Number(row.semanticScore || 0) * 100) : null
    },
    semanticMappingError (mapping) {
      return this.semanticMappingErrors[mapping.id] || ''
    },
    placeMappingIsBusy (mapping) {
      return this.semanticMappingBusyId === mapping.id || this.placeMappingBusyId === mapping.id
    },
    async configureSmartRyde () {
      this.comparisonBusy = true
      try {
        const source = await this.fetchJson('/api/admin/pricing/comparison-sources', {
          method: 'POST',
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ adapterKey: 'smart-ryde', name: 'SmartRyde' })
        })
        await this.reloadComparisons()
        this.selectedComparisonSourceId = source.id
      } finally { this.comparisonBusy = false }
    },
    async reloadComparisons () {
      const sources = await this.fetchJson('/api/admin/pricing/comparison-sources')
      this.comparisonSources = sources.rows || []
      if (!this.selectedComparisonSourceId && this.comparisonSources.length) this.selectedComparisonSourceId = this.comparisonSources[0].id
      await this.reloadComparisonRuns()
    },
    async loadBookingCalculation (page = 1, iata = '') {
      this.bookingCalculationBusy = true
      try {
        const params = new URLSearchParams({ page: String(page), limit: '25' })
        params.set('genius', String(Number(this.bookingGeniusPercent) || 0))
        if (this.bookingSource?.id) params.set('sourceId', this.bookingSource.id)
        if (iata) params.set('iata', iata)
        if (this.q.trim() && !iata) params.set('q', this.q.trim())
        const payload = await this.fetchJson(`/api/admin/pricing/booking-calculation?${params.toString()}`)
        this.bookingCalculation = payload
        this.bookingAirportOptions = payload.airportOptions || []
        this.bookingPage = payload.page || page
        if (!payload.airports?.some((airport) => airport.key === this.selectedBookingAirportKey)) {
          this.selectedBookingAirportKey = payload.airports?.[0]?.key || ''
        }
        const monitoring = payload.source?.schedule?.monitoring || {}
        this.bookingScheduleForm = {
          priceWatchEnabled: monitoring.priceWatchEnabled !== false,
          frequency: monitoring.frequency || 'daily',
          weekday: Number((monitoring.weekdays || [1])[0]) || 1,
          localTime: monitoring.localTime || '08:00'
        }
      } catch (error) {
        this.notice = error.message
      } finally {
        this.bookingCalculationBusy = false
      }
    },
    async loadSelectedBookingAirport () {
      const option = this.bookingAirportOptions.find((airport) => airport.key === this.selectedBookingAirportKey)
      if (option?.iata) await this.loadBookingCalculation(1, option.iata)
    },
    async setBookingView (view) {
      this.bookingView = view
      if (view === 'matrix' && this.bookingCalculation?.total === 1 && this.bookingAirportOptions.length > 1) {
        await this.loadBookingCalculation(1)
      }
    },
    async saveBookingSchedule () {
      if (!this.bookingSource?.id) return
      this.bookingCalculationBusy = true
      try {
        const weekdays = this.bookingScheduleForm.frequency === 'weekly' ? [Number(this.bookingScheduleForm.weekday)] : []
        await this.fetchJson(`/api/admin/pricing/comparison-sources/${this.bookingSource.id}/schedule`, {
          method: 'PUT',
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monitoring: {
              priceWatchEnabled: this.bookingScheduleForm.priceWatchEnabled,
              frequency: this.bookingScheduleForm.frequency,
              weekdays,
              localTime: this.bookingScheduleForm.localTime
            }
          })
        })
        this.notice = this.$store.state.language === 'ru' ? 'График проверки Booking сохранён.' : 'Booking monitoring schedule saved.'
        await this.reloadComparisons()
        await this.loadBookingCalculation(this.bookingPage)
      } finally {
        this.bookingCalculationBusy = false
      }
    },
    async runBookingCheckNow () {
      if (!this.bookingSource?.id) return
      this.bookingCalculationBusy = true
      try {
        const run = await this.fetchJson('/api/admin/pricing/comparison-runs', {
          method: 'POST',
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: this.bookingSource.id })
        })
        await this.fetchJson(`/api/admin/pricing/comparison-runs/${run.id}/execute`, { method: 'POST', headers: this.headers() })
        this.selectedComparisonSourceId = this.bookingSource.id
        this.selectedComparisonRunId = run.id
        this.notice = this.$store.state.language === 'ru'
          ? 'Проверка цен Booking запущена. Результат появится во вкладке «Возможности»; прайс 005 останется без изменений.'
          : 'The Booking price check has started. Results will appear under Opportunities; the 005 price book will remain unchanged.'
        await this.reloadComparisonRuns()
      } finally {
        this.bookingCalculationBusy = false
      }
    },
    async reloadComparisonRuns () {
      if (!this.selectedComparisonSourceId) {
        this.comparisonRuns = []
        this.comparisonData = null
        return
      }
      const payload = await this.fetchJson(`/api/admin/pricing/comparison-runs?sourceId=${encodeURIComponent(this.selectedComparisonSourceId)}`)
      this.comparisonRuns = payload.rows || []
      if (!this.selectedComparisonRunId && this.comparisonRuns.length) this.selectedComparisonRunId = this.comparisonRuns[0].id
      if (this.selectedComparisonRunId) await this.loadComparisonRun(this.selectedComparisonRunId)
    },
    async createComparisonRun () {
      if (!this.selectedComparisonSourceId) return
      this.comparisonBusy = true
      try {
        const run = await this.fetchJson('/api/admin/pricing/comparison-runs', {
          method: 'POST',
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: this.selectedComparisonSourceId })
        })
        this.selectedComparisonRunId = run.id
        await this.reloadComparisonRuns()
      } finally { this.comparisonBusy = false }
    },
    async selectComparisonRun (runId) {
      this.selectedComparisonRunId = runId
      await this.loadComparisonRun(runId)
    },
    async loadComparisonRun (runId) {
      if (!runId) return
      this.comparisonData = await this.fetchJson(`/api/admin/pricing/comparison-runs/${runId}/results`)
      if (this.comparisonData.run.status === 'running') this.scheduleComparisonPoll()
    },
    scheduleComparisonPoll () {
      if (this.comparisonPollTimer) clearTimeout(this.comparisonPollTimer)
      this.comparisonPollTimer = setTimeout(async () => {
        await this.loadComparisonRun(this.selectedComparisonRunId).catch(() => {})
      }, 2500)
    },
    async executeComparisonRun () {
      if (!this.selectedComparisonRunId) return
      this.comparisonBusy = true
      try {
        await this.fetchJson(`/api/admin/pricing/comparison-runs/${this.selectedComparisonRunId}/execute`, { method: 'POST', headers: this.headers() })
        await this.loadComparisonRun(this.selectedComparisonRunId)
        this.scheduleComparisonPoll()
      } finally { this.comparisonBusy = false }
    },
    async approvePlaceMapping (mapping, candidate) {
      if (this.placeMappingIsBusy(mapping)) return
      this.placeMappingBusyId = mapping.id
      this.placeMappingBusyCandidateId = candidate.id
      this.$delete(this.semanticMappingErrors, mapping.id)
      try {
        await this.fetchJson(`/api/admin/pricing/comparison-mappings/places/${mapping.id}`, {
          method: 'PUT',
          headers: { ...this.headers(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ externalPlaceId: candidate.id, externalLabel: candidate.label })
        })
        await this.loadComparisonRun(this.selectedComparisonRunId)
      } catch (_) {
        this.$set(this.semanticMappingErrors, mapping.id, this.t.mappingApplyFailed)
      } finally {
        this.placeMappingBusyId = ''
        this.placeMappingBusyCandidateId = ''
      }
    },
    async suggestPlaceMapping (mapping) {
      if (this.placeMappingIsBusy(mapping)) return
      this.semanticMappingBusyId = mapping.id
      this.$delete(this.semanticMappingErrors, mapping.id)
      try {
        await this.fetchJson(`/api/admin/pricing/comparison-mappings/places/${mapping.id}/semantic-suggestions`, { method: 'POST', headers: this.headers() })
        await this.loadComparisonRun(this.selectedComparisonRunId)
      } catch (_) {
        this.$set(this.semanticMappingErrors, mapping.id, this.t.semanticFailed)
      } finally {
        this.semanticMappingBusyId = ''
      }
    },
    async approveVehicleMapping (quote) {
      await this.fetchJson('/api/admin/pricing/comparison-mappings/vehicles', {
        method: 'PUT',
        headers: { ...this.headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: this.activeComparisonRun.sourceId,
          externalVehicleKey: quote.externalVehicleKey,
          externalVehicleName: quote.externalVehicleName,
          riderraVehicleType: quote.requestedVehicleType
        })
      })
      await this.loadComparisonRun(this.selectedComparisonRunId)
    },
    async downloadComparisonWorkbook () {
      const response = await fetch(`/api/admin/pricing/comparison-runs/${this.selectedComparisonRunId}/export.xlsx`, { headers: this.headers() })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `price-comparison-${this.selectedComparisonRunId}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    priceLabel (value, currency = '') {
      if (value === null || value === undefined || value === '') return '-'
      return `${value}${currency ? ` ${currency}` : ''}`
    },
    priceAmountLabel (value) {
      if (value === null || value === undefined || value === '') return '-'
      return Number.isFinite(Number(value)) ? Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : String(value)
    },
    counterpartyPriceLabel (row, owner) {
      const price = row.counterpartyPrices?.[owner]
      if (!price || price.price === null || price.price === undefined || price.price === '') return '-'
      return this.priceLabel(this.priceAmountLabel(price.price), price.currency || row.currency || '')
    },
    supplierPriceLabel (row, owner) {
      const price = row.supplierPrices?.[owner]
      if (!price || price.price === null || price.price === undefined || price.price === '') return '-'
      return this.priceLabel(this.priceAmountLabel(price.price), price.currency || row.currency || '')
    },
    pricebookSortLabel (row = {}) {
      return [
        this.sheetCountryLabel(row),
        this.sheetPlaceLabel(row.routeFrom, row),
        this.sheetPlaceLabel(row.routeTo, row),
        row.vehicleType || ''
      ].join(' ')
    },
    pricebookRouteKey (row = {}) {
      return [
        this.normalizePricebookPart(this.sheetCountryLabel(row)),
        this.normalizePricebookPart(this.sheetPlaceLabel(row.routeFrom || row.fromPoint, row)),
        this.normalizePricebookPart(this.sheetPlaceLabel(row.routeTo || row.toPoint, row)),
        this.normalizePricebookPart(row.vehicleType || '')
      ].join('|')
    },
    normalizePricebookPart (value = '') {
      return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    },
    sheetCountryLabel (row) {
      return row.country || this.countryByPlace(row.city) || this.countryByPlace(row.routeFrom || row.fromPoint) || this.countryByPlace(row.routeTo || row.toPoint) || row.city || '-'
    },
    sheetPlaceLabel (value = '', row = {}) {
      const place = String(value || '').trim()
      if (!place) return '-'
      const airport = this.airportLabel(place)
      if (airport) return airport
      const zone = this.londonZoneLabel(place, row)
      return zone || place
    },
    countryByPlace (value = '') {
      const airport = this.airportByCode(value)
      if (airport) return airport.country
      const text = String(value || '').toLowerCase()
      const placeCountries = [
        { pattern: 'vancouver', country: 'Canada' },
        { pattern: 'toronto', country: 'Canada' },
        { pattern: 'london', country: 'United Kingdom' }
      ]
      return placeCountries.find((item) => text.includes(item.pattern))?.country || ''
    },
    airportLabel (value = '') {
      const airport = this.airportByCode(value)
      if (!airport) return ''
      const airportName = airport.name.toLowerCase() === airport.city.toLowerCase() ? '' : ` ${airport.name}`
      const airportWord = airport.code === 'LCY' ? 'Airport' : 'airport'
      return `${airport.city}${airportName} ${airportWord} (${airport.code})`
    },
    airportByCode (value = '') {
      const text = String(value || '').trim().toUpperCase()
      const code = text.match(/^[A-Z]{3}$/)?.[0] || text.match(/\(([A-Z]{3})\)/)?.[1] || ''
      const airports = {
        AMS: { city: 'Amsterdam', name: 'Schiphol', country: 'Netherlands' },
        BCN: { city: 'Barcelona', name: 'El Prat', country: 'Spain' },
        BER: { city: 'Berlin', name: 'Brandenburg', country: 'Germany' },
        CDG: { city: 'Paris', name: 'Charles de Gaulle', country: 'France' },
        DME: { city: 'Moscow', name: 'Domodedovo', country: 'Russia' },
        HEL: { city: 'Helsinki', name: 'Vantaa', country: 'Finland' },
        IST: { city: 'Istanbul', name: 'Istanbul', country: 'Turkey' },
        LCY: { city: 'London', name: 'City', country: 'United Kingdom' },
        LGW: { city: 'London', name: 'Gatwick', country: 'United Kingdom' },
        LHR: { city: 'London', name: 'Heathrow', country: 'United Kingdom' },
        LTN: { city: 'London', name: 'Luton', country: 'United Kingdom' },
        MAN: { city: 'Manchester', name: 'Manchester', country: 'United Kingdom' },
        ORY: { city: 'Paris', name: 'Orly', country: 'France' },
        STN: { city: 'London', name: 'Stansted', country: 'United Kingdom' },
        SVO: { city: 'Moscow', name: 'Sheremetyevo', country: 'Russia' },
        VKO: { city: 'Moscow', name: 'Vnukovo', country: 'Russia' },
        YVR: { city: 'Vancouver', name: 'International', country: 'Canada' },
        ZIA: { city: 'Moscow', name: 'Zhukovsky', country: 'Russia' }
      }
      return airports[code] ? { ...airports[code], code } : null
    },
    londonZoneLabel (value = '', row = {}) {
      const zone = String(value || '').trim().toUpperCase()
      const city = String(row.city || row.country || '').toLowerCase()
      const londonZones = ['N', 'E', 'EC', 'SE', 'SW', 'W', 'WC', 'NW']
      if (!londonZones.includes(zone)) return ''
      if (city && !city.includes('london')) return ''
      return `London ${zone}`
    },
    paxLabel (vehicleType = '') {
      const text = String(vehicleType || '')
      const explicit = text.match(/(\d+)\s*(?:pax|pass|passenger|seat|мест|p)/i)
      if (explicit) return explicit[1]
      const anyNumber = text.match(/\b(\d{1,2})\b/)
      if (anyNumber) return anyNumber[1]
      if (/mpv/i.test(text)) return '5'
      if (/class\s+car|sedan|business|first/i.test(text)) return '3'
      return '-'
    },
    toggleCounterparty (name) {
      this.selectedCounterparties = this.selectedCounterparties.includes(name)
        ? this.selectedCounterparties.filter((item) => item !== name)
        : [...this.selectedCounterparties, name]
    },
    clearCounterparties () {
      this.selectedCounterparties = []
    },
    resetCounterpartyVisibleLimit () {
      this.counterpartyVisibleLimit = 250
    },
    showMoreCounterpartyRows () {
      this.counterpartyVisibleLimit += 250
    },
    toggleSupplier (name) {
      this.selectedSuppliers = this.selectedSuppliers.includes(name)
        ? this.selectedSuppliers.filter((item) => item !== name)
        : [...this.selectedSuppliers, name]
    },
    clearSuppliers () {
      this.selectedSuppliers = []
    },
    resetSupplierVisibleLimit () {
      this.supplierVisibleLimit = 250
    },
    showMoreSupplierRows () {
      this.supplierVisibleLimit += 250
    },
    percentLabel (value) {
      if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
      return `${Number(value).toFixed(1)}%`
    },
    currencyTotalsLabel (field) {
      const rows = this.adjustmentTotals.byCurrency || []
      if (!rows.length) return '-'
      return rows
        .filter((row) => row[field] !== null && row[field] !== undefined)
        .map((row) => this.priceLabel(Number(row[field]).toFixed(2), row.currency))
        .join(' / ') || '-'
    },
    conflictSignalCopy (row) {
      const severity = String(row.severity || '').toLowerCase()
      if (String(row.issueType || '') === 'driver_gt_sell') {
        return this.$store.state.language === 'ru'
          ? 'Себестоимость уже выше продажной цены. Нужно менять продажу, исполнителя или согласованные условия.'
          : 'Supplier cost is already above the sell price. Change the sell price, supplier, or agreed terms.'
      }
      if (severity === 'high' || severity === 'critical') {
        return this.$store.state.language === 'ru'
          ? 'Маржа уже опасно низкая или отрицательная. Это нужно разбирать в первую очередь.'
          : 'Margin is already dangerously low or negative. This should be handled first.'
      }
      return this.$store.state.language === 'ru'
        ? 'Есть расхождение, но оно не выглядит критичным. Всё равно нужно проверить правило, цену водителя и продажи.'
        : 'There is a mismatch, but it does not look critical yet. Still worth checking the rule, supplier cost, and sell price.'
    },
    conflictIssueLabel (row) {
      if (row.issueType === 'driver_gt_sell') return this.t.issueDriverGtSell
      if (row.issueType === 'low_margin') return this.t.issueLowMargin
      return row.issueType || '-'
    },
    conflictSeverityLabel (row) {
      const severity = String(row.severity || '').toLowerCase()
      if (severity === 'critical') return this.t.severityCritical
      if (severity === 'warning') return this.t.severityWarning
      return row.severity || '-'
    },
    openBaseForm (row = null) {
      this.editingBase = row || {}
      this.baseForm = {
        country: row?.country || '',
        routeFrom: row?.routeFrom || '',
        routeTo: row?.routeTo || '',
        vehicleType: row?.vehicleType || '',
        fixedPrice: row?.fixedPrice ?? '',
        currency: row?.currency || 'EUR'
      }
    },
    closeBaseForm () {
      this.editingBase = null
    },
    async saveBaseRow () {
      const payload = {
        country: this.baseForm.country || null,
        routeFrom: this.baseForm.routeFrom || null,
        routeTo: this.baseForm.routeTo || null,
        vehicleType: String(this.baseForm.vehicleType || '').trim(),
        fixedPrice: this.baseForm.fixedPrice === '' ? null : parseFloat(this.baseForm.fixedPrice),
        currency: String(this.baseForm.currency || 'EUR').trim().toUpperCase()
      }
      if (!payload.vehicleType) throw new Error('vehicleType is required')
      if (payload.fixedPrice === null || Number.isNaN(payload.fixedPrice)) throw new Error('fixedPrice is required')

      if (this.editingBase?.id) {
        await this.fetchJson(`/api/admin/pricing/cities/${this.editingBase.id}`, {
          method: 'PUT',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      } else {
        await this.fetchJson('/api/admin/pricing/cities', {
          method: 'POST',
          headers: {
            ...this.headers(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      this.closeBaseForm()
      await this.reloadAll()
    },
    async removeBaseRow (row) {
      if (!row?.id) return
      await this.fetchJson(`/api/admin/pricing/cities/${row.id}`, {
        method: 'DELETE',
        headers: this.headers()
      })
      await this.reloadAll()
    },
    async loadExternalClientPrices () {
      if (this.externalCpRowsLoading) return
      this.externalCpRowsLoading = true
      try {
        const payload = await this.fetchJson('/api/admin/pricing/client-price-snapshots?limit=60000')
        this.externalCpRows = payload.rows || []
        this.externalCpRowsLoaded = true
        if (payload.truncated) {
          this.notice = this.$store.state.language === 'ru'
            ? `Показаны последние ${payload.limit} строк публичных прайсов клиентов. Уточните фильтр для полного просмотра.`
            : `Showing the latest ${payload.limit} public client-price rows. Narrow the filter for a complete view.`
        }
      } catch (error) {
        this.notice = `${this.notice ? `${this.notice}. ` : ''}${error.message}`
      } finally {
        this.externalCpRowsLoading = false
      }
    },
    async reloadAll () {
      this.notice = ''
      const [base, cp, cf, dr, adj] = await Promise.allSettled([
        this.fetchJson('/api/admin/pricing/cities?limit=5000'),
        this.fetchJson('/api/admin/pricing/counterparty-rules?active=true&limit=5000'),
        this.fetchJson('/api/admin/pricing/conflicts?status=open&limit=500'),
        this.fetchJson('/api/admin/drivers'),
        this.fetchJson('/api/admin/pricing/adjustments/summary?type=penalty&limit=1000')
      ])
      this.baseRows = base.status === 'fulfilled' ? (base.value.rows || []) : []
      this.cpRows = cp.status === 'fulfilled' ? (cp.value.rows || []) : []
      this.conflictRows = cf.status === 'fulfilled' ? (cf.value.rows || []) : []
      this.driverRows = dr.status === 'fulfilled' ? (Array.isArray(dr.value) ? dr.value : []) : []
      this.adjustmentSummary = adj.status === 'fulfilled' ? adj.value : null

      const errors = [base, cp, cf, dr, adj]
        .filter((x) => x.status === 'rejected')
        .map((x) => x.reason?.message || 'unknown')
      this.notice = errors.length
        ? `Часть данных не загружена: ${errors.join('; ')}`
        : `${this.t.loadedRows}: ${this.baseRows.length}`
      await this.reloadComparisons().catch((error) => {
        this.notice = `${this.notice ? `${this.notice}. ` : ''}${error.message}`
      })
    },
    async recalc () {
      await fetch('/api/admin/pricing/conflicts/recalculate', { method: 'POST', headers: this.headers() })
      await this.reloadAll()
    },
    async downloadEtaTemplate () {
      const response = await fetch('/api/admin/pricing/export-eta-template', { headers: this.headers() })
      if (!response.ok) return
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ETA_Fixed_Price_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.admin-section {
  padding-top: 150px;
  color: #17233d;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 14px;
}

.page-subtitle {
  margin: 6px 0 0;
  max-width: 760px;
  color: #60708f;
  font-size: 15px;
  line-height: 1.55;
}

.page-head-actions,
.toolbar,
.subtabs,
.actions,
.row-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions {
  margin-top: 20px;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.overview-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #d8e0ef;
  background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
  box-shadow: 0 12px 28px rgba(16, 30, 67, 0.06);
}

.overview-card__value {
  font-size: 28px;
  font-weight: 800;
  color: #17233d;
}

.overview-card__label {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #223356;
}

.overview-card__hint {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
}

.overview-card--warn { border-color: #fde68a; background: linear-gradient(180deg, #fffdf4 0%, #fff8dc 100%); }
.overview-card--critical { border-color: #fecaca; background: linear-gradient(180deg, #fff8f8 0%, #ffefef 100%); }
.overview-card--ok { border-color: #bbf7d0; background: linear-gradient(180deg, #f7fff9 0%, #edfff3 100%); }
.overview-card--info { border-color: #bfdbfe; background: linear-gradient(180deg, #f7fbff 0%, #ecf5ff 100%); }

.subtab {
  border: 1px solid #d8e0ef;
  border-radius: 999px;
  padding: 10px 14px;
  background: #fff;
  color: #1f3b70;
  font-weight: 700;
}

.subtab--active {
  background: var(--staff-accent, #243b73);
  color: #fff;
  border-color: var(--staff-accent, #243b73);
  box-shadow: 0 6px 14px rgba(36, 59, 115, 0.16);
}

.subtab--active:hover {
  background: var(--staff-ink, #17233d);
  border-color: var(--staff-ink, #17233d);
}

.toolbar {
  margin-bottom: 14px;
  align-items: center;
}

.toolbar-search {
  flex: 1 1 320px;
}

.pricebook-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  width: 100%;
}

.filter-chip {
  border: 1px solid #d8e0ef;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
  color: #1f3b70;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.filter-chip--active {
  border-color: #1f4fff;
  background: #eef4ff;
  color: #173fb4;
}

.hint {
  margin-bottom: 12px;
  color: #4a628c;
}

.panel {
  background: #fff;
  border: 1px solid #d8d8e6;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 14px 28px rgba(16, 24, 40, 0.06);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 14px;
}

.panel-hint {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.5;
}

.pricing-list {
  border: 1px solid #e6ebf5;
  border-radius: 14px;
  overflow: hidden;
}

.pricing-list--sheet {
  overflow-x: auto;
}

.pricing-list__head,
.pricing-row {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
}

.pricing-list__head {
  font-weight: 700;
  color: #1d2c4a;
  border-bottom: 1px solid #e4e7f0;
  background: #fbfcff;
}

.pricing-row {
  color: #2f3e60;
  border-bottom: 1px solid #f0f2f7;
}

.pricing-list__more {
  padding: 14px 16px;
  border-top: 1px solid #eef2f7;
  background: #fbfcff;
}

.pricing-list__head--sheet,
.pricing-row--sheet {
  grid-template-columns:
    minmax(130px, .8fr)
    minmax(220px, 1.35fr)
    minmax(220px, 1.35fr)
    minmax(170px, 1fr)
    minmax(64px, .45fr)
    minmax(100px, .6fr)
    minmax(92px, .55fr)
    minmax(180px, 1fr);
  min-width: 1240px;
}

.supplier-cell {
  color: #1d2c4a;
}

.pricing-list__head--base,
.pricing-row--base,
.pricing-list__head--conflicts,
.pricing-row--conflicts,
.pricing-list__head--adjustments,
.pricing-row--adjustments {
  grid-template-columns: minmax(240px, 1.1fr) minmax(180px, .8fr) minmax(160px, .7fr) minmax(260px, 1fr);
}

.pricing-list__head--adjustment-stat,
.pricing-row--adjustment-stat {
  grid-template-columns: minmax(160px, 1fr) 90px minmax(120px, .7fr);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.mini-stat {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e6ebf5;
  border-radius: 12px;
  background: #fbfcff;
}

.mini-stat span {
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.mini-stat strong {
  color: #17233d;
  font-size: 22px;
}

.split-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.adjustments-recent {
  margin-top: 14px;
}

.route-cell,
.signal-cell,
.price-cell {
  display: grid;
  gap: 6px;
}

.route-cell__title,
.signal-cell__title {
  color: #1d2c4a;
  font-weight: 700;
}

.route-cell__sub,
.signal-cell__copy,
.muted,
.modal-subtitle {
  color: #6b7280;
  line-height: 1.5;
}

.price-cell strong {
  color: #102b63;
}

.row-actions--inline {
  margin-top: 8px;
}

.class-badge {
  display: inline-block;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  background: #e5f4ff;
  color: #0b3a66;
  font-weight: 600;
  font-size: 12px;
}

.class-badge--missing {
  background: #ffe8e8;
  color: #8a1f1f;
}

.severity-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.severity-pill--high {
  background: #fef2f2;
  color: #991b1b;
}

.severity-pill--critical {
  background: #fef2f2;
  color: #991b1b;
}

.severity-pill--medium {
  background: #fff7ed;
  color: #c2410c;
}

.severity-pill--warning {
  background: #fff7ed;
  color: #c2410c;
}

.severity-pill--low {
  background: #eff6ff;
  color: #1d4ed8;
}

.empty-state {
  padding: 28px;
  text-align: center;
  color: #64748b;
}

.input {
  border: 1px solid #d8d8e6;
  border-radius: 12px;
  padding: 10px 12px;
  min-width: 220px;
  width: 100%;
  box-sizing: border-box;
  min-height: 48px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal {
  width: min(820px, 95vw);
  max-height: min(92vh, 720px);
  overflow: auto;
  background: #ffffff;
  border-radius: 16px;
  padding: 22px 24px;
  border: 1px solid #d8d8e6;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 18px;
  row-gap: 20px;
  margin-top: 20px;
}

.pricing-field {
  display: grid;
  grid-template-rows: auto 52px;
  gap: 6px;
  min-width: 0;
}

.pricing-field__label {
  display: block;
  color: #17233d;
  font-size: 14px;
  font-weight: 700;
  line-height: 18px;
  margin: 0;
  padding: 0;
}

.pricing-field__input {
  min-height: 52px;
  height: 52px;
  padding: 0 14px;
  font-size: 16px;
  line-height: 52px;
}

.modal-actions {
  margin-top: 24px;
  align-items: center;
}

.btn {
  border: none;
  border-radius: 14px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  background: #eef2ff;
  color: #1f3b70;
}

.btn--small {
  padding: 9px 12px;
  font-size: 13px;
}

.btn--primary {
  background: var(--staff-accent, #243b73);
  color: #fff;
  box-shadow: 0 6px 14px rgba(36, 59, 115, 0.16);
}

.btn--primary:hover:not(:disabled) {
  background: var(--staff-ink, #17233d);
}

.btn--ghost {
  background: #fff;
  border: 1px solid #d7e0ef;
  color: #21385f;
}

.btn--danger {
  background: #b42318;
  color: #fff;
}

.btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.comparison-workspace {
  display: grid;
  gap: 20px;
}

.booking-workspace {
  display: grid;
  gap: 18px;
}

.booking-formula-card,
.booking-schedule-card {
  padding: 18px;
  border: 1px solid #d7e0ef;
  border-radius: 16px;
  background: #f8fafc;
}

.booking-formula-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  color: #52647f;
}

.booking-formula-card strong {
  color: #17233d;
}

.booking-schedule-card {
  display: grid;
  grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(150px, .7fr)) auto;
  align-items: end;
  gap: 14px;
}

.booking-schedule-card h4 {
  margin: 0 0 4px;
}

.booking-schedule-card label {
  display: grid;
  gap: 6px;
}

.booking-toggle {
  display: flex !important;
  align-items: center;
  align-self: center;
  color: #17233d;
  font-weight: 700;
}

.booking-view-switch {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.booking-head-actions {
  align-self: flex-start;
  flex-wrap: nowrap;
}

.booking-head-actions .btn {
  min-height: 40px;
  padding: 10px 14px;
  line-height: 1.2;
  white-space: nowrap;
}

.booking-airports,
.booking-portal-workspace {
  display: grid;
  gap: 18px;
}

.booking-airport-card,
.booking-vehicle-plan {
  overflow: hidden;
  border: 1px solid #d7e0ef;
  border-radius: 16px;
  background: #fff;
}

.booking-airport-title,
.booking-vehicle-plan__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: #f8fafc;
}

.booking-airport-title span,
.booking-vehicle-plan__head span {
  color: #64748b;
}

.booking-price-matrix,
.booking-portal-table {
  width: 100%;
  min-width: 980px;
  border-collapse: separate;
  border-spacing: 0;
  color: #17233d;
}

.booking-price-matrix th,
.booking-price-matrix td,
.booking-portal-table th,
.booking-portal-table td {
  padding: 12px 14px;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.booking-price-matrix thead th,
.booking-portal-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #eef2ff;
  font-weight: 800;
}

.booking-price-matrix td:first-child { min-width: 150px; }
.booking-price-matrix td:nth-child(2) { min-width: 190px; }
.booking-price-matrix td:nth-child(3) { min-width: 260px; }
.booking-price-matrix td small,
.booking-price-matrix th small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-weight: 400;
  line-height: 1.35;
}
.booking-price-matrix__missing { color: #94a3b8; background: #f8fafc; }

.booking-portal-controls {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(180px, .5fr) auto minmax(280px, 1.2fr);
  align-items: end;
  gap: 14px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  background: #eff6ff;
}

.booking-percent-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.booking-genius-note {
  display: grid;
  gap: 4px;
  color: #1e3a5f;
  font-size: 13px;
  line-height: 1.4;
}

.booking-vehicle-plan__head h4 { margin: 0 0 4px; }
.booking-portal-table th:first-child { min-width: 250px; }
.booking-portal-table__internal { background: #f0fdf4; color: #166534; }

.booking-portal-fields {
  display: grid;
  grid-template-columns: repeat(4, minmax(170px, 1fr));
  gap: 10px;
  padding: 16px;
}

.booking-portal-fields > div {
  display: grid;
  gap: 5px;
  padding: 13px;
  border: 1px solid #d7e0ef;
  border-radius: 12px;
  background: #f8fafc;
}

.booking-portal-fields small,
.booking-portal-fields span { color: #64748b; }
.booking-plan-warning { margin: 0; padding: 0 16px 16px; color: #64748b; font-size: 12px; line-height: 1.45; }

.booking-table-wrap {
  overflow-x: auto;
  border: 1px solid #d7e0ef;
  border-radius: 16px;
}

.booking-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.15fr) repeat(5, minmax(190px, 1fr));
  min-width: 1220px;
}

.booking-grid--head {
  background: #eef2ff;
  color: #17233d;
  font-weight: 700;
}

.booking-grid--head > div,
.booking-grid--row > div {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.booking-grid--row:last-child > div {
  border-bottom: 0;
}

.booking-route-cell,
.booking-point-cell {
  display: grid;
  align-content: start;
  gap: 5px;
}

.booking-route-cell span,
.booking-route-cell small,
.booking-point-cell small {
  color: #64748b;
}

.booking-point-cell span {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.booking-driver-target {
  color: #166534;
}

.booking-point-cell--missing {
  background: #f8fafc;
  color: #94a3b8;
}

.booking-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.comparison-head,
.comparison-current,
.comparison-actions,
.comparison-policy,
.review-row,
.review-candidates {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn--recommended {
  border-color: #16a34a;
  background: #ecfdf3;
  color: #166534;
}

.comparison-head,
.comparison-current,
.review-row {
  justify-content: space-between;
}

.comparison-setup,
.review-block {
  padding: 18px;
  border: 1px solid #d7e0ef;
  border-radius: 16px;
  background: #f8fafc;
}

.comparison-setup {
  display: grid;
  grid-template-columns: minmax(220px, 360px) 1fr;
  gap: 8px 18px;
}

.comparison-setup > label {
  grid-column: 1 / -1;
}

.comparison-policy {
  flex-wrap: wrap;
  color: #52647f;
  font-size: 13px;
}

.comparison-runs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.comparison-run-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid #d7e0ef;
  border-radius: 14px;
  background: #fff;
  color: #17233d;
  text-align: left;
  cursor: pointer;
}

.comparison-run-card--active {
  border-color: #1f4fff;
  box-shadow: 0 0 0 2px rgba(31, 79, 255, 0.12);
}

.comparison-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 10px;
  flex: 1;
}

.mini-stat--green {
  background: #ecfdf3;
  color: #166534;
}

.review-block h4 {
  margin: 0 0 4px;
}

.review-row {
  position: relative;
  padding: 12px 0;
  border-top: 1px solid #e2e8f0;
  transition: background-color 180ms ease, box-shadow 180ms ease, margin 180ms ease, padding 180ms ease;
}

.review-row:first-of-type {
  border-top: none;
}

.review-row--vehicle > div {
  display: grid;
  gap: 3px;
}

.review-row__main {
  display: grid;
  min-width: 220px;
  gap: 5px;
}

.review-row__progress {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #52647f;
  font-size: 12px;
}

.review-row__progress i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #1f4fff;
  animation: semantic-dot 1.1s ease-in-out infinite;
}

.review-row__progress i:nth-child(2) {
  animation-delay: 140ms;
}

.review-row__progress i:nth-child(3) {
  animation-delay: 280ms;
}

.review-row__error {
  color: #991b1b;
  font-size: 12px;
}

.review-row--processing,
.review-row--error {
  margin: 4px -10px;
  padding: 12px 10px;
  border-radius: 12px;
}

.review-row--processing {
  background: #eef4ff;
  box-shadow: inset 3px 0 #1f4fff;
}

.review-row--error {
  background: #fff7f7;
  box-shadow: inset 3px 0 #dc2626;
}

.review-row--vehicle span,
.route-cell span {
  color: #64748b;
  font-size: 12px;
}

.review-candidates {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.semantic-suggest-btn {
  display: inline-flex;
  min-width: 190px;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.semantic-suggest-btn--processing.btn:disabled {
  border-color: #1f2e4d;
  background: #1f2e4d;
  color: #fff;
  cursor: wait;
  opacity: 1;
}

.mapping-choice-btn--processing.btn:disabled {
  display: inline-flex;
  min-width: 132px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-color: #1f2e4d;
  background: #1f2e4d;
  color: #fff;
  cursor: wait;
  opacity: 1;
}

.semantic-spinner {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #fff;
  border-radius: 50%;
  animation: semantic-spin 750ms linear infinite;
}

@keyframes semantic-spin {
  to { transform: rotate(360deg); }
}

@keyframes semantic-dot {
  0%, 70%, 100% { opacity: .25; transform: translateY(0); }
  35% { opacity: 1; transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  .review-row {
    transition: none;
  }

  .semantic-spinner,
  .review-row__progress i {
    animation: none;
  }
}

.pricing-list__head--opportunities,
.pricing-row--opportunities {
  grid-template-columns: minmax(260px, 1.7fr) minmax(160px, 1fr) repeat(4, minmax(110px, .7fr)) minmax(130px, .8fr);
}

.status-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: #eef2ff;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--opportunity,
.status-pill--ready {
  background: #dcfce7;
  color: #166534;
}

.status-pill--needs_review,
.status-pill--configured,
.status-pill--running {
  background: #fef3c7;
  color: #92400e;
}

.status-pill--failed {
  background: #fee2e2;
  color: #991b1b;
}

@media (max-width: 1100px) {
  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pricing-list__head,
  .pricing-row,
  .split-panels,
  .stats-grid,
  .booking-schedule-card,
  .booking-portal-controls,
  .booking-portal-fields,
  .comparison-kpis,
  .comparison-setup {
    grid-template-columns: 1fr;
  }

  .comparison-current,
  .review-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .page-head,
  .panel-head {
    flex-direction: column;
  }

  .page-head-actions,
  .subtabs {
    width: 100%;
  }

  .subtabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .subtab {
    flex: 0 0 auto;
  }

  .overview-strip,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    width: 100%;
  }

  .page-head-actions .btn,
  .actions .btn {
    width: 100%;
  }

  .modal {
    width: min(100vw - 16px, 760px);
    padding: 16px;
  }
}
</style>
