import 'package:flutter/material.dart';

import 'core/flight/airport_flight_client.dart';
import 'core/layout/driver_page_shell.dart';

import 'core/tokens/driver_tokens.dart';

class FlightQueryPage extends StatefulWidget {
  const FlightQueryPage({super.key});

  @override
  State<FlightQueryPage> createState() => _FlightQueryPageState();
}

class _FlightQueryPageState extends State<FlightQueryPage> {
  final _client = AirportFlightClient();
  final _searchController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  bool _loading = false;
  String? _error;
  bool _arrivals = true;
  List<AirportFlight> _flights = const [];

  @override
  void initState() {
    super.initState();
    _queryFlights();
  }

  @override
  void dispose() {
    _client.dispose();
    _searchController.dispose();
    super.dispose();
  }

  String get _dateText => '${_selectedDate.year.toString().padLeft(4, '0')}-'
      '${_selectedDate.month.toString().padLeft(2, '0')}-'
      '${_selectedDate.day.toString().padLeft(2, '0')}';

  List<AirportFlight> get _filteredFlights {
    final query = _searchController.text.trim().toUpperCase();
    if (query.isEmpty) return _flights;
    return _flights
        .where((flight) =>
            flight.flightNumber.toUpperCase().contains(query) ||
            (flight.destination ?? '').toUpperCase().contains(query))
        .toList();
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null || date == _selectedDate) return;
    setState(() => _selectedDate = date);
    await _queryFlights();
  }

  Future<void> _queryFlights() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final flights = _arrivals
          ? await _client.fetchArrivals(_selectedDate)
          : await _client.fetchDepartures(_selectedDate);
      if (mounted) {
        setState(() {
          _flights = flights;
          _loading = false;
        });
      }
    } on AirportFlightException catch (error) {
      if (mounted) {
        setState(() {
          _error = error.message;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = '航班資料暫時無法取得，請稍後重試';
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => DriverPageShell(
        selectedIndex: 2,
        bottomPadding: 140,
        navHorizontalPadding: 30,
        onHomeTap: () => Navigator.of(context).pop(),
        onOrderTap: () => Navigator.of(context).pop(),
        onProfileTap: () => Navigator.of(context).pop(),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            IconButton(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.arrow_back)),
            const Expanded(
                child: Text('航班查詢',
                    style:
                        TextStyle(fontSize: 24, fontWeight: FontWeight.w800))),
          ]),
          const SizedBox(height: DriverSpacing.md),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: DriverColors.surface,
              borderRadius: BorderRadius.circular(DriverRadii.card),
              border: Border.all(color: DriverColors.divider),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _loading ? null : _selectDate,
                        icon: const Icon(Icons.calendar_today_outlined),
                        label: Text(_dateText),
                      ),
                    ),
                    const SizedBox(width: DriverSpacing.md),
                    FilledButton(
                      onPressed: _loading ? null : _queryFlights,
                      child: const Text('查詢'),
                    ),
                  ],
                ),
                const SizedBox(height: DriverSpacing.sm),
                Row(
                  children: [
                    const Text('航班方向'),
                    const SizedBox(width: DriverSpacing.md),
                    ChoiceChip(
                      label: const Text('抵港'),
                      selected: _arrivals,
                      onSelected: _loading
                          ? null
                          : (selected) {
                              if (selected) {
                                setState(() => _arrivals = true);
                                _queryFlights();
                              }
                            },
                    ),
                    const SizedBox(width: DriverSpacing.sm),
                    ChoiceChip(
                      label: const Text('離港'),
                      selected: !_arrivals,
                      onSelected: _loading
                          ? null
                          : (selected) {
                              if (selected) {
                                setState(() => _arrivals = false);
                                _queryFlights();
                              }
                            },
                    ),
                  ],
                ),
                const SizedBox(height: DriverSpacing.md),
                TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(
                    labelText: '搜尋航班或目的地',
                    prefixIcon: Icon(Icons.search_rounded),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: DriverSpacing.md),
          Text(
            '香港國際機場 · ${_arrivals ? '抵港' : '離港'}航班',
            style: const TextStyle(
              color: DriverColors.secondaryText,
              fontSize: DriverTypography.body,
            ),
          ),
          const SizedBox(height: DriverSpacing.lg),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_error != null)
            Center(child: Text(_error!))
          else if (_filteredFlights.isEmpty)
            const Center(child: Text('找不到符合的航班'))
          else
            ..._filteredFlights.map(
              (flight) => _FlightTile(flight: flight, arrivals: _arrivals),
            ),
        ]),
      );
}

class _FlightTile extends StatelessWidget {
  const _FlightTile({required this.flight, required this.arrivals});
  final AirportFlight flight;
  final bool arrivals;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: DriverSpacing.md),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: DriverColors.surface,
            borderRadius: BorderRadius.circular(DriverRadii.card),
            border: Border.all(color: DriverColors.divider)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(flight.time,
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(width: DriverSpacing.md),
            Expanded(
                child: Text(flight.flightNumber,
                    style: const TextStyle(fontWeight: FontWeight.w700))),
            Text(flight.status)
          ]),
          const SizedBox(height: DriverSpacing.sm),
          Text(arrivals
              ? '來源 ${flight.origin ?? '--'}'
              : '目的地 ${flight.destination ?? '--'}'),
          const SizedBox(height: DriverSpacing.xs),
          if (arrivals && flight.baggage != null)
            Text('行李轉盤 ${flight.baggage} · 大堂 ${flight.hall ?? '--'}'),
          const SizedBox(height: DriverSpacing.xs),
          Text(
            arrivals
                ? '航廈 ${flight.terminal.isEmpty ? '--' : flight.terminal} · 停機位 ${flight.stand ?? '--'}'
                : '航廈 ${flight.terminal} · 登機閘口 ${flight.gate}',
            style: const TextStyle(color: DriverColors.secondaryText),
          ),
        ]),
      );
}
