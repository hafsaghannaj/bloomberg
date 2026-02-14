'===============================================================================
' Bloomberg Price Recorder - VBA Macro Workbook
'===============================================================================
' PURPOSE:  Automatically record intraday price snapshots from Bloomberg Terminal
'           at configurable intervals, with a live dashboard and daily sheets.
'
' REQUIRES: Bloomberg Excel Add-in (BLPAPI COM) installed and enabled.
'           Enable via: Bloomberg Menu > Start Bloomberg > Bloomberg Add-in.
'
' BLOOMBERG FUNCTIONS USED:
'   BDP(ticker, field)  - Bloomberg Data Point: fetches a single real-time value.
'                         e.g., BDP("SPX Index", "PX_LAST") returns current price.
'   BDH(ticker, field, start, end, [optional args])
'                       - Bloomberg Data History: fetches historical time series.
'                         e.g., BDH("SPX Index","PX_LAST","20260101","20260214")
'
' SETUP INSTRUCTIONS:
'   1. Open a new Excel workbook on a Bloomberg Terminal
'   2. Press Alt+F11 to open VBA Editor
'   3. Insert > Module, paste this entire file
'   4. Insert > Module again, paste the ThisWorkbook code at the bottom
'   5. Run "InitializeWorkbook" once to create all sheets
'   6. Configure settings on the "Settings" tab
'   7. Click "Start Recording" on Dashboard or let auto-start handle it
'===============================================================================

Option Explicit

' ---------------------------------------------------------------------------
' GLOBAL STATE
' ---------------------------------------------------------------------------
Public RecordingActive As Boolean          ' True while recording loop is running
Public NextRecordTime As Double            ' Scheduled time for next snapshot
Public MarketOpenTime As Date              ' Today's market open (from Settings)
Public MarketCloseTime As Date             ' Today's market close (from Settings)

' ---------------------------------------------------------------------------
' CONSTANTS
' ---------------------------------------------------------------------------
Private Const DASHBOARD_SHEET As String = "Dashboard"
Private Const SETTINGS_SHEET As String = "Settings"
Private Const MAX_RETRIES As Integer = 3   ' Bloomberg reconnection attempts
Private Const RETRY_DELAY_SEC As Integer = 5

' =====================================================================
' SECTION 1: WORKBOOK INITIALIZATION
' =====================================================================

Public Sub InitializeWorkbook()
    '-------------------------------------------------------------------
    ' Creates the Settings and Dashboard sheets with all formatting.
    ' Run this ONCE when setting up a new workbook.
    '-------------------------------------------------------------------
    Application.ScreenUpdating = False

    ' Create Settings sheet
    Call CreateSettingsSheet

    ' Create Dashboard sheet
    Call CreateDashboardSheet

    ' Create today's data sheet
    Call CreateDailySheet(Date)

    Application.ScreenUpdating = True
    MsgBox "Workbook initialized successfully!" & vbNewLine & _
           "1. Configure your tickers and settings on the 'Settings' tab." & vbNewLine & _
           "2. Recording will auto-start at market open, or click 'Start Recording'.", _
           vbInformation, "Bloomberg Price Recorder"
End Sub

Private Sub CreateSettingsSheet()
    '-------------------------------------------------------------------
    ' Builds the Settings tab with all configurable parameters.
    '-------------------------------------------------------------------
    Dim ws As Worksheet
    Set ws = GetOrCreateSheet(SETTINGS_SHEET)
    ws.Cells.Clear

    ' --- Title ---
    With ws.Range("B2")
        .Value = "BLOOMBERG PRICE RECORDER - SETTINGS"
        .Font.Size = 14
        .Font.Bold = True
        .Font.Color = RGB(255, 130, 0)  ' Bloomberg orange
    End With

    ' --- Ticker Configuration ---
    ws.Range("B4").Value = "TICKER LIST"
    ws.Range("B4").Font.Bold = True
    ws.Range("B4").Font.Size = 11
    ws.Range("B4").Interior.Color = RGB(40, 40, 40)
    ws.Range("B4").Font.Color = RGB(255, 255, 255)

    ws.Range("B5").Value = "Ticker"
    ws.Range("C5").Value = "Description"
    ws.Range("D5").Value = "Active"
    ws.Range("B5:D5").Font.Bold = True
    ws.Range("B5:D5").Interior.Color = RGB(80, 80, 80)
    ws.Range("B5:D5").Font.Color = RGB(255, 255, 255)

    ' Default tickers
    ws.Range("B6").Value = "SPX Index"
    ws.Range("C6").Value = "S&P 500 Index"
    ws.Range("D6").Value = True

    ws.Range("B7").Value = "SPY US Equity"
    ws.Range("C7").Value = "SPDR S&P 500 ETF"
    ws.Range("D7").Value = True

    ' Placeholder rows for user to add more tickers (rows 8-20)
    Dim i As Long
    For i = 8 To 20
        ws.Range("B" & i).Value = ""
        ws.Range("C" & i).Value = ""
        ws.Range("D" & i).Value = False
    Next i

    ' Add data validation (TRUE/FALSE dropdown) for Active column
    Dim rngActive As Range
    Set rngActive = ws.Range("D6:D20")
    With rngActive.Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
             Formula1:="TRUE,FALSE"
    End With

    ws.Range("B22").Value = "ADD NEW TICKER"
    ws.Range("B22").Font.Bold = True
    ws.Range("B22").Font.Color = RGB(100, 100, 100)
    ws.Range("B23").Value = "Enter Bloomberg ticker in column B (e.g., 'AAPL US Equity', 'EURUSD Curncy')"
    ws.Range("B23").Font.Italic = True
    ws.Range("B23").Font.Color = RGB(150, 150, 150)

    ' --- Recording Interval ---
    ws.Range("F4").Value = "RECORDING INTERVAL"
    ws.Range("F4").Font.Bold = True
    ws.Range("F4").Font.Size = 11
    ws.Range("F4").Interior.Color = RGB(40, 40, 40)
    ws.Range("F4").Font.Color = RGB(255, 255, 255)

    ws.Range("F5").Value = "Interval (minutes):"
    ws.Range("G5").Value = 5  ' Default: 5 minutes

    ' Dropdown for interval selection
    With ws.Range("G5").Validation
        .Delete
        .Add Type:=xlValidateList, AlertStyle:=xlValidAlertStop, _
             Formula1:="1,5,15,30,60"
    End With
    ws.Range("G5").Interior.Color = RGB(255, 255, 200)

    ' --- Market Hours ---
    ws.Range("F7").Value = "MARKET HOURS (ET)"
    ws.Range("F7").Font.Bold = True
    ws.Range("F7").Font.Size = 11
    ws.Range("F7").Interior.Color = RGB(40, 40, 40)
    ws.Range("F7").Font.Color = RGB(255, 255, 255)

    ws.Range("F8").Value = "Market Open:"
    ws.Range("G8").Value = TimeValue("09:30:00")
    ws.Range("G8").NumberFormat = "hh:mm AM/PM"

    ws.Range("F9").Value = "Market Close:"
    ws.Range("G9").Value = TimeValue("16:00:00")
    ws.Range("G9").NumberFormat = "hh:mm AM/PM"

    ' --- Alert Thresholds ---
    ws.Range("F11").Value = "ALERT THRESHOLDS"
    ws.Range("F11").Font.Bold = True
    ws.Range("F11").Font.Size = 11
    ws.Range("F11").Interior.Color = RGB(40, 40, 40)
    ws.Range("F11").Font.Color = RGB(255, 255, 255)

    ws.Range("F12").Value = "Highlight threshold (%):"
    ws.Range("G12").Value = 0.5   ' Default: 0.5%
    ws.Range("G12").NumberFormat = "0.00"
    ws.Range("G12").Interior.Color = RGB(255, 255, 200)

    ws.Range("F13").Value = "Alert popup threshold (%):"
    ws.Range("G13").Value = 1#    ' Default: 1.0%
    ws.Range("G13").NumberFormat = "0.00"
    ws.Range("G13").Interior.Color = RGB(255, 255, 200)

    ' --- Status ---
    ws.Range("F15").Value = "STATUS"
    ws.Range("F15").Font.Bold = True
    ws.Range("F15").Font.Size = 11
    ws.Range("F15").Interior.Color = RGB(40, 40, 40)
    ws.Range("F15").Font.Color = RGB(255, 255, 255)

    ws.Range("F16").Value = "Recording Status:"
    ws.Range("G16").Value = "STOPPED"
    ws.Range("G16").Font.Color = RGB(255, 0, 0)
    ws.Range("G16").Font.Bold = True

    ws.Range("F17").Value = "Last Snapshot:"
    ws.Range("G17").Value = "N/A"

    ws.Range("F18").Value = "Snapshots Today:"
    ws.Range("G18").Value = 0

    ' Column widths
    ws.Columns("B").ColumnWidth = 20
    ws.Columns("C").ColumnWidth = 25
    ws.Columns("D").ColumnWidth = 10
    ws.Columns("E").ColumnWidth = 3
    ws.Columns("F").ColumnWidth = 25
    ws.Columns("G").ColumnWidth = 18

    ' Dark theme background
    ws.Cells.Interior.Color = RGB(30, 30, 30)
    ws.Cells.Font.Color = RGB(220, 220, 220)
    ' Re-apply specific colors that were set above
    ws.Range("G5").Interior.Color = RGB(255, 255, 200)
    ws.Range("G5").Font.Color = RGB(0, 0, 0)
    ws.Range("G12").Interior.Color = RGB(255, 255, 200)
    ws.Range("G12").Font.Color = RGB(0, 0, 0)
    ws.Range("G13").Interior.Color = RGB(255, 255, 200)
    ws.Range("G13").Font.Color = RGB(0, 0, 0)
End Sub

Private Sub CreateDashboardSheet()
    '-------------------------------------------------------------------
    ' Builds the Dashboard tab with headers and control buttons.
    '-------------------------------------------------------------------
    Dim ws As Worksheet
    Set ws = GetOrCreateSheet(DASHBOARD_SHEET)
    ws.Cells.Clear

    ' --- Title ---
    With ws.Range("B2")
        .Value = "BLOOMBERG PRICE RECORDER - LIVE DASHBOARD"
        .Font.Size = 14
        .Font.Bold = True
        .Font.Color = RGB(255, 130, 0)
    End With

    ws.Range("B3").Value = "Date: " & Format(Date, "yyyy-mm-dd")
    ws.Range("B3").Font.Color = RGB(180, 180, 180)

    ' --- Control Buttons (created as shapes via macro - described below) ---
    ' We add button placeholders; actual buttons added by AddDashboardButtons
    ws.Range("F2").Value = "[Run AddDashboardButtons to create control buttons]"
    ws.Range("F2").Font.Color = RGB(150, 150, 150)
    ws.Range("F2").Font.Italic = True

    ' --- Column Headers (row 5) ---
    Dim headers As Variant
    headers = Array("Timestamp", "Ticker", "Last Price", "Open Price", _
                    "Change", "% Change", "Volume", "VWAP", "Bid", "Ask")

    Dim col As Long
    For col = 0 To UBound(headers)
        With ws.Cells(5, col + 2)
            .Value = headers(col)
            .Font.Bold = True
            .Font.Color = RGB(255, 255, 255)
            .Interior.Color = RGB(0, 80, 160)  ' Bloomberg blue header
            .HorizontalAlignment = xlCenter
        End With
    Next col

    ' Column widths
    ws.Columns("B").ColumnWidth = 20  ' Timestamp
    ws.Columns("C").ColumnWidth = 18  ' Ticker
    ws.Columns("D").ColumnWidth = 14  ' Last Price
    ws.Columns("E").ColumnWidth = 14  ' Open Price
    ws.Columns("F").ColumnWidth = 12  ' Change
    ws.Columns("G").ColumnWidth = 12  ' % Change
    ws.Columns("H").ColumnWidth = 14  ' Volume
    ws.Columns("I").ColumnWidth = 14  ' VWAP
    ws.Columns("J").ColumnWidth = 12  ' Bid
    ws.Columns("K").ColumnWidth = 12  ' Ask

    ' Dark theme
    ws.Cells.Interior.Color = RGB(30, 30, 30)
    ws.Cells.Font.Color = RGB(220, 220, 220)
    ' Re-apply header row colors
    ws.Range("B5:K5").Interior.Color = RGB(0, 80, 160)
    ws.Range("B5:K5").Font.Color = RGB(255, 255, 255)
End Sub

Public Sub AddDashboardButtons()
    '-------------------------------------------------------------------
    ' Adds Start/Stop/Backfill buttons to the Dashboard.
    ' Run once after InitializeWorkbook.
    '-------------------------------------------------------------------
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(DASHBOARD_SHEET)

    ' Remove existing buttons
    Dim shp As Shape
    For Each shp In ws.Shapes
        If shp.Type = msoFormControl Then shp.Delete
    Next shp

    ' Start Recording button
    Dim btnStart As Shape
    Set btnStart = ws.Shapes.AddFormControl(xlButtonControl, _
        ws.Range("F2").Left, ws.Range("F2").Top, 120, 25)
    btnStart.Name = "btnStart"
    btnStart.TextFrame.Characters.Text = "Start Recording"
    btnStart.OnAction = "StartRecording"

    ' Stop Recording button
    Dim btnStop As Shape
    Set btnStop = ws.Shapes.AddFormControl(xlButtonControl, _
        ws.Range("H2").Left, ws.Range("H2").Top, 120, 25)
    btnStop.Name = "btnStop"
    btnStop.TextFrame.Characters.Text = "Stop Recording"
    btnStop.OnAction = "StopRecording"

    ' Backfill button
    Dim btnBackfill As Shape
    Set btnBackfill = ws.Shapes.AddFormControl(xlButtonControl, _
        ws.Range("J2").Left, ws.Range("J2").Top, 120, 25)
    btnBackfill.Name = "btnBackfill"
    btnBackfill.TextFrame.Characters.Text = "Backfill History"
    btnBackfill.OnAction = "BackfillHistory"

    ws.Range("F2").Value = ""  ' Clear placeholder text
End Sub

' =====================================================================
' SECTION 2: RECORDING ENGINE
' =====================================================================

Public Sub StartRecording()
    '-------------------------------------------------------------------
    ' Begins the scheduled recording loop.
    ' Reads settings, validates Bloomberg connection, then schedules
    ' the first snapshot via Application.OnTime.
    '-------------------------------------------------------------------
    If RecordingActive Then
        MsgBox "Recording is already active.", vbInformation
        Exit Sub
    End If

    ' Validate Bloomberg connection before starting
    If Not IsBloombergConnected() Then
        MsgBox "Bloomberg is not connected. Please ensure the Bloomberg " & _
               "Excel Add-in is running and you are logged in.", _
               vbCritical, "Connection Error"
        Exit Sub
    End If

    ' Check if today is a market holiday
    If IsMarketHoliday(Date) Then
        MsgBox "Today appears to be a market holiday. Recording not started.", _
               vbExclamation, "Market Holiday"
        Exit Sub
    End If

    ' Load settings
    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    MarketOpenTime = DateValue(Date) + wsSettings.Range("G8").Value
    MarketCloseTime = DateValue(Date) + wsSettings.Range("G9").Value

    ' Ensure today's sheet exists
    Call CreateDailySheet(Date)

    ' Record the opening price
    Call RecordOpeningPrices

    ' Mark as active
    RecordingActive = True
    wsSettings.Range("G16").Value = "RECORDING"
    wsSettings.Range("G16").Font.Color = RGB(0, 200, 0)

    ' Schedule first snapshot
    Call ScheduleNextSnapshot

    Debug.Print "Recording started at " & Now()
End Sub

Public Sub StopRecording()
    '-------------------------------------------------------------------
    ' Stops the recording loop by cancelling the scheduled OnTime event.
    '-------------------------------------------------------------------
    On Error Resume Next  ' OnTime cancel may fail if no event is scheduled
    Application.OnTime EarliestTime:=NextRecordTime, _
                       Procedure:="TakeSnapshot", _
                       Schedule:=False
    On Error GoTo 0

    RecordingActive = False

    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    wsSettings.Range("G16").Value = "STOPPED"
    wsSettings.Range("G16").Font.Color = RGB(255, 0, 0)

    Debug.Print "Recording stopped at " & Now()
End Sub

Private Sub ScheduleNextSnapshot()
    '-------------------------------------------------------------------
    ' Calculates the next snapshot time based on the configured interval
    ' and schedules it via Application.OnTime.
    '-------------------------------------------------------------------
    If Not RecordingActive Then Exit Sub

    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    Dim intervalMin As Long
    intervalMin = wsSettings.Range("G5").Value  ' Interval in minutes

    ' Calculate next snapshot time
    NextRecordTime = Now() + TimeSerial(0, intervalMin, 0)

    ' If next snapshot is past market close, stop recording
    If NextRecordTime > MarketCloseTime Then
        Call StopRecording
        MsgBox "Market closed. Recording stopped for today.", vbInformation
        Exit Sub
    End If

    ' Schedule the snapshot
    ' Application.OnTime calls TakeSnapshot at the specified time
    Application.OnTime EarliestTime:=NextRecordTime, _
                       Procedure:="TakeSnapshot"
End Sub

Public Sub TakeSnapshot()
    '-------------------------------------------------------------------
    ' Core recording routine. Called on schedule by Application.OnTime.
    ' Fetches current prices for all active tickers using BDP(),
    ' writes to both Dashboard and daily sheet.
    '-------------------------------------------------------------------
    On Error GoTo ErrorHandler

    If Not RecordingActive Then Exit Sub

    ' Check market hours
    If Now() < MarketOpenTime Or Now() > MarketCloseTime Then
        Call ScheduleNextSnapshot
        Exit Sub
    End If

    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    Dim wsDash As Worksheet
    Set wsDash = ThisWorkbook.Sheets(DASHBOARD_SHEET)
    Dim wsDaily As Worksheet
    Set wsDaily = GetOrCreateSheet(Format(Date, "yyyy-mm-dd"))

    Dim tickers As Collection
    Set tickers = GetActiveTickers()

    Dim snapTime As String
    snapTime = Format(Now(), "yyyy-mm-dd hh:mm:ss")

    Dim ticker As Variant
    Dim dashRow As Long
    dashRow = GetNextDashboardRow(wsDash)
    Dim dailyRow As Long
    dailyRow = GetNextDailyRow(wsDaily)

    Dim t As Long
    For t = 1 To tickers.Count
        ticker = tickers(t)

        ' ---------------------------------------------------------
        ' BDP() CALLS - Bloomberg Data Point
        ' Each BDP call fetches one real-time field for one security.
        ' Common fields:
        '   PX_LAST     = Last traded price
        '   PX_OPEN     = Today's opening price
        '   PX_VOLUME   = Cumulative volume today
        '   EQY_WEIGHTED_AVG_PX = Volume-weighted average price (VWAP)
        '   PX_BID / PX_ASK = Current bid/ask
        ' ---------------------------------------------------------
        Dim lastPrice As Variant
        Dim openPrice As Variant
        Dim volume As Variant
        Dim vwap As Variant
        Dim bid As Variant
        Dim ask As Variant

        lastPrice = FetchBDP(CStr(ticker), "PX_LAST")
        openPrice = FetchBDP(CStr(ticker), "PX_OPEN")
        volume = FetchBDP(CStr(ticker), "PX_VOLUME")
        vwap = FetchBDP(CStr(ticker), "EQY_WEIGHTED_AVG_PX")
        bid = FetchBDP(CStr(ticker), "PX_BID")
        ask = FetchBDP(CStr(ticker), "PX_ASK")

        ' Calculate change from open
        Dim priceChange As Variant
        Dim pctChange As Variant
        If IsNumeric(lastPrice) And IsNumeric(openPrice) And openPrice <> 0 Then
            priceChange = lastPrice - openPrice
            pctChange = (priceChange / openPrice) * 100
        Else
            priceChange = "N/A"
            pctChange = "N/A"
        End If

        ' --- Write to Dashboard ---
        wsDash.Cells(dashRow, 2).Value = snapTime          ' Timestamp
        wsDash.Cells(dashRow, 3).Value = ticker             ' Ticker
        wsDash.Cells(dashRow, 4).Value = lastPrice          ' Last Price
        wsDash.Cells(dashRow, 5).Value = openPrice          ' Open Price
        wsDash.Cells(dashRow, 6).Value = priceChange        ' Change
        wsDash.Cells(dashRow, 7).Value = pctChange          ' % Change
        wsDash.Cells(dashRow, 8).Value = volume             ' Volume
        wsDash.Cells(dashRow, 9).Value = vwap               ' VWAP
        wsDash.Cells(dashRow, 10).Value = bid               ' Bid
        wsDash.Cells(dashRow, 11).Value = ask               ' Ask

        ' Format numbers
        If IsNumeric(lastPrice) Then wsDash.Cells(dashRow, 4).NumberFormat = "#,##0.00"
        If IsNumeric(openPrice) Then wsDash.Cells(dashRow, 5).NumberFormat = "#,##0.00"
        If IsNumeric(priceChange) Then wsDash.Cells(dashRow, 6).NumberFormat = "+#,##0.00;-#,##0.00"
        If IsNumeric(pctChange) Then wsDash.Cells(dashRow, 7).NumberFormat = "+0.00%;-0.00%"
        If IsNumeric(volume) Then wsDash.Cells(dashRow, 8).NumberFormat = "#,##0"

        ' --- Highlight significant moves ---
        Dim threshold As Double
        threshold = wsSettings.Range("G12").Value  ' e.g., 0.5
        Dim alertThreshold As Double
        alertThreshold = wsSettings.Range("G13").Value  ' e.g., 1.0

        If IsNumeric(pctChange) Then
            If pctChange > threshold Then
                ' Positive significant move -> green highlight
                wsDash.Range(wsDash.Cells(dashRow, 2), wsDash.Cells(dashRow, 11)).Interior.Color = RGB(0, 60, 0)
                wsDash.Cells(dashRow, 7).Font.Color = RGB(0, 230, 0)
            ElseIf pctChange < -threshold Then
                ' Negative significant move -> red highlight
                wsDash.Range(wsDash.Cells(dashRow, 2), wsDash.Cells(dashRow, 11)).Interior.Color = RGB(80, 0, 0)
                wsDash.Cells(dashRow, 7).Font.Color = RGB(255, 60, 60)
            End If

            ' Popup alert for very large moves
            If Abs(pctChange) > alertThreshold Then
                MsgBox ticker & " moved " & Format(pctChange, "+0.00") & "% from open!", _
                       vbExclamation, "Price Alert"
            End If
        End If

        ' --- Write to Daily Sheet ---
        wsDaily.Cells(dailyRow, 1).Value = snapTime
        wsDaily.Cells(dailyRow, 2).Value = ticker
        wsDaily.Cells(dailyRow, 3).Value = lastPrice
        wsDaily.Cells(dailyRow, 4).Value = openPrice
        wsDaily.Cells(dailyRow, 5).Value = priceChange
        wsDaily.Cells(dailyRow, 6).Value = pctChange
        wsDaily.Cells(dailyRow, 7).Value = volume
        wsDaily.Cells(dailyRow, 8).Value = vwap
        wsDaily.Cells(dailyRow, 9).Value = bid
        wsDaily.Cells(dailyRow, 10).Value = ask

        dashRow = dashRow + 1
        dailyRow = dailyRow + 1
    Next t

    ' Update status
    wsSettings.Range("G17").Value = snapTime
    wsSettings.Range("G18").Value = wsSettings.Range("G18").Value + 1

    ' Schedule next snapshot
    Call ScheduleNextSnapshot
    Exit Sub

ErrorHandler:
    Debug.Print "Error in TakeSnapshot: " & Err.Number & " - " & Err.Description
    ' Attempt to recover and continue
    Call HandleBloombergError(Err.Number, Err.Description)
    If RecordingActive Then Call ScheduleNextSnapshot
End Sub

' =====================================================================
' SECTION 3: BLOOMBERG DATA ACCESS HELPERS
' =====================================================================

Private Function FetchBDP(ticker As String, field As String) As Variant
    '-------------------------------------------------------------------
    ' Wraps a BDP() call with error handling and retry logic.
    '
    ' BDP (Bloomberg Data Point) retrieves a single current value.
    ' It is the real-time equivalent of typing "BDP" in a cell:
    '   =BDP("SPX Index","PX_LAST")
    '
    ' We call it via VBA using Application.Run to invoke the Bloomberg
    ' Add-in function programmatically.
    '-------------------------------------------------------------------
    On Error GoTo RetryLogic

    Dim result As Variant
    Dim attempt As Integer

    For attempt = 1 To MAX_RETRIES
        On Error Resume Next

        ' Application.Run calls the Bloomberg Add-in's BDP function.
        ' The Bloomberg Add-in registers "BDP" as a worksheet function
        ' that VBA can invoke via Application.Run.
        result = Application.Run("BDP", ticker, field)

        If Err.Number = 0 Then
            ' Check for Bloomberg error strings like "#N/A Requesting..."
            If Not IsError(result) And Not IsEmpty(result) Then
                If InStr(1, CStr(result), "#N/A") = 0 Then
                    FetchBDP = result
                    Exit Function
                End If
            End If
        End If

        On Error GoTo 0

        ' Wait before retry (Bloomberg may be loading data)
        Application.Wait Now() + TimeSerial(0, 0, RETRY_DELAY_SEC)
        DoEvents  ' Allow Excel to process Bloomberg data callbacks
    Next attempt

    ' All retries exhausted
    FetchBDP = "ERR"
    Debug.Print "BDP failed after " & MAX_RETRIES & " retries: " & ticker & " / " & field
    Exit Function

RetryLogic:
    FetchBDP = "ERR"
    Debug.Print "BDP error: " & Err.Description & " for " & ticker & " / " & field
End Function

Private Function IsBloombergConnected() As Boolean
    '-------------------------------------------------------------------
    ' Tests Bloomberg connectivity by making a simple BDP call.
    ' Returns True if Bloomberg responds with valid data.
    '-------------------------------------------------------------------
    On Error GoTo NotConnected

    Dim testResult As Variant
    testResult = Application.Run("BDP", "SPX Index", "PX_LAST")

    If IsError(testResult) Or IsEmpty(testResult) Then
        IsBloombergConnected = False
    ElseIf InStr(1, CStr(testResult), "#N/A") > 0 Then
        IsBloombergConnected = False
    Else
        IsBloombergConnected = True
    End If
    Exit Function

NotConnected:
    IsBloombergConnected = False
End Function

' =====================================================================
' SECTION 4: HISTORICAL BACKFILL (BDH)
' =====================================================================

Public Sub BackfillHistory()
    '-------------------------------------------------------------------
    ' Uses BDH() to pull historical daily data for all active tickers.
    '
    ' BDH (Bloomberg Data History) retrieves a time series of data:
    '   =BDH("SPX Index","PX_LAST","20260101","20260214")
    '
    ' This fetches daily closing prices from Jan 1 to Feb 14, 2026.
    ' BDH returns an array that fills multiple cells.
    '
    ' Optional parameters (passed as name-value pairs):
    '   "periodicitySelection" = "DAILY"/"WEEKLY"/"MONTHLY"
    '   "nonTradingDayFillOption" = "NON_TRADING_WEEKDAYS"
    '   "nonTradingDayFillMethod" = "PREVIOUS_VALUE"
    '-------------------------------------------------------------------
    Dim daysBack As Long
    daysBack = CLng(InputBox("How many trading days to backfill?", _
                             "Backfill History", "30"))
    If daysBack <= 0 Then Exit Sub

    Dim startDate As String
    Dim endDate As String
    startDate = Format(DateAdd("d", -(daysBack * 1.5), Date), "yyyymmdd")  ' Extra buffer for weekends
    endDate = Format(Date, "yyyymmdd")

    Dim wsBackfill As Worksheet
    Set wsBackfill = GetOrCreateSheet("Backfill")
    wsBackfill.Cells.Clear

    ' Header
    wsBackfill.Range("A1").Value = "HISTORICAL BACKFILL"
    wsBackfill.Range("A1").Font.Bold = True
    wsBackfill.Range("A1").Font.Size = 12
    wsBackfill.Range("A2").Value = "Generated: " & Format(Now(), "yyyy-mm-dd hh:mm:ss")

    Dim tickers As Collection
    Set tickers = GetActiveTickers()

    Dim colOffset As Long
    colOffset = 0

    Dim t As Long
    For t = 1 To tickers.Count
        Dim ticker As String
        ticker = tickers(t)

        Dim startCol As Long
        startCol = 1 + (colOffset * 3)

        ' Header for this ticker
        wsBackfill.Cells(4, startCol).Value = ticker
        wsBackfill.Cells(4, startCol).Font.Bold = True
        wsBackfill.Cells(5, startCol).Value = "Date"
        wsBackfill.Cells(5, startCol + 1).Value = "Close"
        wsBackfill.Cells(5, startCol + 2).Value = "Volume"
        wsBackfill.Range(wsBackfill.Cells(5, startCol), wsBackfill.Cells(5, startCol + 2)).Font.Bold = True

        ' ---------------------------------------------------------
        ' BDH() CALL - Bloomberg Data History
        ' Returns a 2D array: rows = dates, columns = requested fields
        ' We request PX_LAST (close) and PX_VOLUME for the date range.
        ' ---------------------------------------------------------
        On Error Resume Next
        Dim histData As Variant
        histData = Application.Run("BDH", ticker, "PX_LAST,PX_VOLUME", _
                                   startDate, endDate, _
                                   "periodicitySelection", "DAILY")

        If Err.Number = 0 And IsArray(histData) Then
            Dim r As Long
            For r = 1 To UBound(histData, 1)
                wsBackfill.Cells(5 + r, startCol).Value = histData(r, 1)       ' Date
                wsBackfill.Cells(5 + r, startCol).NumberFormat = "yyyy-mm-dd"
                wsBackfill.Cells(5 + r, startCol + 1).Value = histData(r, 2)   ' Close
                wsBackfill.Cells(5 + r, startCol + 1).NumberFormat = "#,##0.00"
                If UBound(histData, 2) >= 3 Then
                    wsBackfill.Cells(5 + r, startCol + 2).Value = histData(r, 3) ' Volume
                    wsBackfill.Cells(5 + r, startCol + 2).NumberFormat = "#,##0"
                End If
            Next r
        Else
            wsBackfill.Cells(6, startCol).Value = "Error fetching data"
            Err.Clear
        End If
        On Error GoTo 0

        ' Auto-fit columns
        wsBackfill.Columns(startCol).AutoFit
        wsBackfill.Columns(startCol + 1).AutoFit
        wsBackfill.Columns(startCol + 2).AutoFit

        colOffset = colOffset + 1
    Next t

    MsgBox "Backfill complete! See the 'Backfill' sheet.", vbInformation
End Sub

' =====================================================================
' SECTION 5: OPENING PRICE CAPTURE
' =====================================================================

Private Sub RecordOpeningPrices()
    '-------------------------------------------------------------------
    ' Captures the opening price for each active ticker at market open.
    ' Stored on the daily sheet row 2 as a reference for change calculations.
    '-------------------------------------------------------------------
    Dim wsDaily As Worksheet
    Set wsDaily = GetOrCreateSheet(Format(Date, "yyyy-mm-dd"))

    Dim tickers As Collection
    Set tickers = GetActiveTickers()

    ' Write opening prices header
    wsDaily.Range("L1").Value = "OPENING PRICES"
    wsDaily.Range("L1").Font.Bold = True
    wsDaily.Range("L2").Value = "Ticker"
    wsDaily.Range("M2").Value = "Open Price"
    wsDaily.Range("N2").Value = "Time Captured"
    wsDaily.Range("L2:N2").Font.Bold = True

    Dim t As Long
    For t = 1 To tickers.Count
        Dim openPx As Variant
        openPx = FetchBDP(CStr(tickers(t)), "PX_OPEN")

        ' If PX_OPEN is not yet available (pre-market), use PX_LAST
        If Not IsNumeric(openPx) Or openPx = "ERR" Then
            openPx = FetchBDP(CStr(tickers(t)), "PX_LAST")
        End If

        wsDaily.Cells(2 + t, 12).Value = tickers(t)
        wsDaily.Cells(2 + t, 13).Value = openPx
        wsDaily.Cells(2 + t, 14).Value = Format(Now(), "hh:mm:ss")
    Next t
End Sub

' =====================================================================
' SECTION 6: DAILY SHEET MANAGEMENT
' =====================================================================

Private Sub CreateDailySheet(dt As Date)
    '-------------------------------------------------------------------
    ' Creates a sheet named by date (e.g., "2026-02-14") with headers.
    '-------------------------------------------------------------------
    Dim sheetName As String
    sheetName = Format(dt, "yyyy-mm-dd")

    Dim ws As Worksheet
    Set ws = GetOrCreateSheet(sheetName)

    ' Only add headers if sheet is empty
    If ws.Cells(1, 1).Value = "" Then
        Dim headers As Variant
        headers = Array("Timestamp", "Ticker", "Last Price", "Open Price", _
                        "Change", "% Change", "Volume", "VWAP", "Bid", "Ask")

        Dim col As Long
        For col = 0 To UBound(headers)
            With ws.Cells(1, col + 1)
                .Value = headers(col)
                .Font.Bold = True
                .Interior.Color = RGB(0, 80, 160)
                .Font.Color = RGB(255, 255, 255)
            End With
        Next col

        ' Dark background
        ws.Cells.Interior.Color = RGB(30, 30, 30)
        ws.Cells.Font.Color = RGB(220, 220, 220)
        ws.Range("A1:J1").Interior.Color = RGB(0, 80, 160)
        ws.Range("A1:J1").Font.Color = RGB(255, 255, 255)
    End If
End Sub

' =====================================================================
' SECTION 7: UTILITY FUNCTIONS
' =====================================================================

Private Function GetActiveTickers() As Collection
    '-------------------------------------------------------------------
    ' Reads the Settings sheet and returns a Collection of active tickers.
    '-------------------------------------------------------------------
    Dim tickers As New Collection
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SETTINGS_SHEET)

    Dim row As Long
    For row = 6 To 20
        Dim tickerVal As String
        tickerVal = Trim(ws.Range("B" & row).Value)
        Dim isActive As Boolean
        isActive = ws.Range("D" & row).Value

        If Len(tickerVal) > 0 And isActive Then
            tickers.Add tickerVal
        End If
    Next row

    ' Warn if no tickers configured
    If tickers.Count = 0 Then
        MsgBox "No active tickers configured! Go to Settings tab and add tickers.", _
               vbExclamation, "No Tickers"
    End If

    Set GetActiveTickers = tickers
End Function

Private Function GetOrCreateSheet(sheetName As String) As Worksheet
    '-------------------------------------------------------------------
    ' Returns the sheet with the given name, creating it if it doesn't exist.
    '-------------------------------------------------------------------
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(sheetName)
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = sheetName
    End If

    Set GetOrCreateSheet = ws
End Function

Private Function GetNextDashboardRow(ws As Worksheet) As Long
    '-------------------------------------------------------------------
    ' Returns the next empty row on the Dashboard (data starts at row 6).
    '-------------------------------------------------------------------
    GetNextDashboardRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).row + 1
    If GetNextDashboardRow < 6 Then GetNextDashboardRow = 6
End Function

Private Function GetNextDailyRow(ws As Worksheet) As Long
    '-------------------------------------------------------------------
    ' Returns the next empty row on a daily sheet (data starts at row 2).
    '-------------------------------------------------------------------
    GetNextDailyRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row + 1
    If GetNextDailyRow < 2 Then GetNextDailyRow = 2
End Function

Private Function IsMarketHoliday(dt As Date) As Boolean
    '-------------------------------------------------------------------
    ' Checks if the given date is a US market holiday.
    ' Uses a static list; in production you could use BDH to check
    ' if data exists for the date, or use the Bloomberg SHOL function.
    '
    ' Alternative: Use BDP("SPX Index","TRADING_DT_REALTIME") to check
    ' if Bloomberg considers today a trading day.
    '-------------------------------------------------------------------

    ' First check: weekends
    If Weekday(dt) = vbSaturday Or Weekday(dt) = vbSunday Then
        IsMarketHoliday = True
        Exit Function
    End If

    ' Try Bloomberg-based check
    On Error Resume Next
    Dim tradingDate As Variant
    tradingDate = Application.Run("BDP", "SPX Index", "TRADING_DT_REALTIME")
    If Err.Number = 0 And IsDate(tradingDate) Then
        ' If Bloomberg's trading date doesn't match today, it's a holiday
        If CDate(tradingDate) <> dt Then
            IsMarketHoliday = True
            Exit Function
        End If
    End If
    On Error GoTo 0

    ' Fallback: static 2026 US market holiday list
    Dim holidays As Variant
    holidays = Array( _
        DateSerial(2026, 1, 1), _
        DateSerial(2026, 1, 19), _
        DateSerial(2026, 2, 16), _
        DateSerial(2026, 4, 3), _
        DateSerial(2026, 5, 25), _
        DateSerial(2026, 6, 19), _
        DateSerial(2026, 7, 3), _
        DateSerial(2026, 9, 7), _
        DateSerial(2026, 11, 26), _
        DateSerial(2026, 12, 25) _
    )

    Dim h As Variant
    For Each h In holidays
        If dt = CDate(h) Then
            IsMarketHoliday = True
            Exit Function
        End If
    Next h

    IsMarketHoliday = False
End Function

Private Sub HandleBloombergError(errNum As Long, errDesc As String)
    '-------------------------------------------------------------------
    ' Handles Bloomberg disconnection and common errors.
    ' Attempts reconnection before giving up.
    '-------------------------------------------------------------------
    Debug.Print "Bloomberg Error: " & errNum & " - " & errDesc

    ' Wait and retry connection
    Dim attempt As Integer
    For attempt = 1 To MAX_RETRIES
        Application.Wait Now() + TimeSerial(0, 0, RETRY_DELAY_SEC * attempt)
        DoEvents

        If IsBloombergConnected() Then
            Debug.Print "Bloomberg reconnected on attempt " & attempt
            Exit Sub
        End If
    Next attempt

    ' Could not reconnect - stop recording and alert user
    RecordingActive = False

    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    wsSettings.Range("G16").Value = "DISCONNECTED"
    wsSettings.Range("G16").Font.Color = RGB(255, 165, 0)  ' Orange

    MsgBox "Bloomberg connection lost and could not be re-established." & vbNewLine & _
           "Recording has been paused. Please check your Bloomberg connection " & _
           "and restart recording.", vbCritical, "Bloomberg Disconnected"
End Sub

' =====================================================================
' SECTION 8: AUTO-START / AUTO-STOP (ThisWorkbook Events)
' =====================================================================
' IMPORTANT: The code below must be placed in the ThisWorkbook module,
' NOT in a standard module. In VBA Editor:
'   1. Double-click "ThisWorkbook" in the Project Explorer
'   2. Paste ONLY the code between the === markers below
'
' === PASTE INTO ThisWorkbook MODULE ===

'Private Sub Workbook_Open()
'    '-------------------------------------------------------------------
'    ' Fires when the workbook is opened. Schedules auto-start at market
'    ' open if the workbook is opened before 9:30 AM ET.
'    '-------------------------------------------------------------------
'    Dim wsSettings As Worksheet
'    On Error Resume Next
'    Set wsSettings = ThisWorkbook.Sheets("Settings")
'    On Error GoTo 0
'
'    If wsSettings Is Nothing Then
'        ' Workbook not yet initialized
'        Exit Sub
'    End If
'
'    Dim openTime As Date
'    openTime = DateValue(Date) + wsSettings.Range("G8").Value
'
'    If Now() < openTime Then
'        ' Schedule auto-start at market open
'        Application.OnTime EarliestTime:=openTime, Procedure:="StartRecording"
'        MsgBox "Recording will auto-start at " & Format(openTime, "hh:mm AM/PM"), _
'               vbInformation, "Auto-Start Scheduled"
'    ElseIf Now() < DateValue(Date) + wsSettings.Range("G9").Value Then
'        ' Market is currently open - start immediately
'        Call StartRecording
'    End If
'End Sub

'Private Sub Workbook_BeforeClose(Cancel As Boolean)
'    '-------------------------------------------------------------------
'    ' Fires before workbook closes. Stops recording to prevent orphan
'    ' OnTime events.
'    '-------------------------------------------------------------------
'    If RecordingActive Then
'        Call StopRecording
'    End If
'End Sub

' === END ThisWorkbook MODULE CODE ===

' =====================================================================
' SECTION 9: DASHBOARD CLEAR / REFRESH
' =====================================================================

Public Sub ClearDashboard()
    '-------------------------------------------------------------------
    ' Clears today's data from the Dashboard (keeps headers).
    '-------------------------------------------------------------------
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(DASHBOARD_SHEET)

    If ws.Cells(ws.Rows.Count, 2).End(xlUp).row > 5 Then
        ws.Range("B6:K" & ws.Cells(ws.Rows.Count, 2).End(xlUp).row).Clear
    End If

    ' Reset dark background on cleared rows
    ws.Range("B6:K1000").Interior.Color = RGB(30, 30, 30)
    ws.Range("B6:K1000").Font.Color = RGB(220, 220, 220)

    ' Update date
    ws.Range("B3").Value = "Date: " & Format(Date, "yyyy-mm-dd")

    ' Reset snapshot counter
    Dim wsSettings As Worksheet
    Set wsSettings = ThisWorkbook.Sheets(SETTINGS_SHEET)
    wsSettings.Range("G18").Value = 0
End Sub
